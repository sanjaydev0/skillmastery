# AGENTS.md

Repository instructions for AI agents and human contributors working on **SkillMastery**.

Read these first, in order:

1. `DESIGN.md` — the visual and copy contract.
2. `README.md` — product behaviour and user-facing setup.
3. `docs/source/flutter-24-week-plan.txt` — the long-form source plan behind the Flutter track.
4. This file — engineering rules, data invariants, and known traps.

The workstation-level `AGENTS.md` still applies (CachyOS, Hyprland, Zed, 8 GB RAM). This file adds repo-specific rules.

---

## 1. What this repo is

SkillMastery is an offline-first React PWA that acts as a control centre for a six-month Flutter, Dart and UI/UX course. It is deployed only on Vercel at <https://skillmastery-jay.vercel.app/>.

It is **not** a course player, code editor, terminal, or cloud account. It stores progress locally, shows the next real task, keeps estimates honest, and points at external docs, GitHub and AnkiDroid.

Two 24-week tracks are bundled (Flutter and Full-Stack Web). The Flutter track is the active teaching track. Week 1 is fully authored as seven day cards written for a 13-year-old. Week 2 keeps its authored task list. Weeks 2–24 draw their weekly brief from the blueprint; only Week 1 has authored day cards.

The guided course adds a start-date clock, pausable progress, weekly capacity, restorable deletion and an editorial day-card layer. Schema is v5.

**Current state (October 2026):**

- Phases 1–5 are shipped: local-first foundation, estimates, the seven-view shell, the reviewed Week 1 curriculum, Help expansion, resource additions, and the optional AI prompt runner.
- The board-and-paper design pass is shipped (`53e8cab`).
- Phase 5 added editable prompt skills in `AppData`, a device-local Velona key, the stateless `/api/chat` proxy, exact AnkiDroid TSV guidance and the last sub-11px fixes.
- Phase 6 (guided course) is built and covered by tests, pending one deployment: Day 0 and the start clock, pause and resume, schema v5 day slots, seven authored Week 1 cards, AI week generation with a reviewed draft, the three-thread syllabus, optional progress marks, and a restorable trash with a UI.
- The native Android/AnkiDroid companion is later. There is no Android project in this repo yet.

---

## 2. Non-negotiables

- **Vercel only.** No GitHub Pages workflow, no `gh-pages` branch, no second host. The live alias is `skillmastery-jay.vercel.app`.
- **Local-first.** No account, analytics, telemetry, cloud sync or runtime curriculum fetch. Progress lives in IndexedDB with a localStorage mirror.
- **No time tracking.** No timers, stopwatches, elapsed time, session countdowns or “time remaining”. Estimates are ranges; checking a task credits the whole range.
- **Two layers, one truth.** `checklist` items carry `day` and are the evidence layer. `dayPlans[weekId]` carries the editorial card: title, summary, tasks, direction and design note. Checking a task is the only thing that earns credit; a day card never claims progress.
- **Week 1 is hand-authored.** Do not replace it with generated copy. Weeks 2–24 may be generated only through the blueprint brief, must pass `checkDayPlans`, and must be reviewed before they are canonical.
- **Zed + Flutter CLI + physical phone.** Do not reintroduce Android Studio, an emulator, or an IDE-specific workflow into the course or Help.
- **The learner is 13.** Plain language in the learner-facing path; technical depth belongs behind “Go deeper”.
- **Never commit secrets.** The Velona API key is device-local. It must never appear in `AppData`, an export, a fixture, a screenshot, a log, or `vercel.json`.
- **Do not delete user data to fix a bug.** Backups and storage migrations must be additive or explicitly confirmed by the user.

---

## 3. Commands

Node `>=22.12.0` (`.nvmrc` pins 22).

```bash
npm install
npm run dev        # Vite dev server, http://127.0.0.1:5173
npm test           # Vitest, currently 223 tests across 30 files
npm run lint       # oxlint
npx tsc -b         # type-check without emitting (also runs inside build)
npm run build      # tsc -b + Vite production build into dist/
npm run preview    # serve dist/ on http://localhost:4173
```

Before every push:

```bash
npx tsc -b && npm test && npm run lint && npm run build
```

`npm run lint` currently reports 13 pre-existing warnings and zero errors. Do not add new warnings. Do not silence a warning with a blanket disable.

---

## 4. Architecture map

```
api/chat.ts              Stateless Velona proxy (not in the app tsconfig)
src/
  App.tsx                Route switch, hydration gate, global sheets
  main.tsx               Boot, autosave start, PWA registration
  components/
    layout/              AppShell, command palette, settings, trash, track switcher, mobile More
    ui/                  Primitives, Sheet, Toaster
  content/               The day-card style standard and its executable checker
  data/
    tracks/              Authored subjects: weeks, nodes, cards, resources
    curriculum/          blueprint.ts: the static 24-week Flutter route
    seedData.ts          Fresh AppData seed
    prompts.ts           Editable prompt-skill templates
    books.ts, rhythm.ts  Shared canon and daily rhythm
  engine/                Pure logic: estimates, gating, SRS, FIRe, mastery, remediation
  features/              One folder per view: today, plan, map, practice, library, progress, help
  hooks/                 History-depth and AI-key hooks
  lib/                   Router, dates, utilities (Anki export, downloads, cn/percent)
  services/              Storage, migrations, seed upgrade, history, exports, validation, install, AI client
  store/                 Zustand AppStore and uiStore
  types/schema.ts        The single source of truth for persisted entities
  index.css              Design tokens and component classes
public/                  Icons, manifest assets
docs/source/             Long-form course source (not shipped)
```

**Routing** is hash-based in `src/lib/router.ts`. The canonical views are `today`, `plan`, `map`, `practice`, `library`, `progress`, `help`. Legacy hashes (`overview`, `curriculum`, `nodes`, `recall`, `vault`) must keep working. Week detail is `#/plan/<weekId>`; node detail is `#/map` with a node sheet.

**State** is one Zustand store (`AppStore`) plus a small UI store for sheets, palette and toasts. Engine functions are pure and independently tested. Do not put derived totals into storage.

---

## 5. Data model and invariants

Schema: `SCHEMA_VERSION = 5`, `SEED_VERSION = 5` in `src/types/schema.ts`.

`AppData` contains:

- `subjects[]` — each with phases, weeks, nodes, cards and resources.
- `books[]` — the shared 30-minute canon.
- `dailyLog`, `overrides`, `prefs`, `planner`.
- `promptOverrides` — edited prompt skills keyed by authored prompt id. Included in backups.
- `journey` — the course clock: `startedAt`, `startWeekday`, `pauses[]`, `gameLayer`, `onboardedAt`.
- `dayPlans` — editorial cards keyed by week id, seven per week. Absent weeks are generation-ready.
- `trash` — the last 20 deletions, restorable. A purged week also drops its day cards.
- `activeSubjectId`, `schemaVersion`, `seedVersion`, timestamps.

Rules:

1. **Estimates** live on `ChecklistItem.estimate` (`{ min, max }`). A legacy `minutes` field is a fallback only. `estimateOf()` handles the fallback; `formatEstimate()` renders a task range; `formatTotal()` renders any aggregate.
2. **Completion credit.** Checking a task adds its full estimate range to the completed total for the day, week and course. The planned total stays fixed; unchecking removes the credit. Do not add a separate “actual time” field.
3. **Weekdays and day slots.** `Weekday` is `0 = Sunday … 6 = Saturday`, matching `Date.getDay()`, and is used by the planner. `ChecklistItem.day` and `DayPlan.day` are day slots 1–7 inside the course week, so Day 1 stays Day 1 even when it is a Wednesday. Derive the real weekday with `weekdayOfSlot(journey.startWeekday, slot)`. Display strips are Monday-first; use `weekdayOf()` / the ordered helpers. Do not flip these by hand.
4. **Capacity** lives in `planner` and is device-local. It is two weekly totals (`weeklyActiveMinutes`, `weeklyPassiveMinutes`) split across `studyDays`; `dailyCapacity()` is the only divisor. Importing a backup must not replace it. `resetToSeed` keeps the current planner and theme. The default is 720 active / 420 passive over seven days: 103 / 60 per day.
5. **Gating.** A week opens when the previous week's gate passed, or when an audited override exists. A gate passes at average ≥ 4.0 with no category below 3. Never add a silent bypass.
6. **Mastery** is earned through the gate or a node review, not by checking a box. `markNodeMastered` must keep validating the gate.
7. **Cards** use the fixed ladder `1 / 3 / 6 / 10 / 7 days` (`SRS_INTERVALS`). `scheduleStep` indexes it; `dueAt` is epoch ms. Review grades map through `gradeCard`.
8. **Resources** are `docs | curriculum | article`; books are separate. Do not merge them into one entity.
9. **Prompt skills** are authored in `src/data/prompts.ts`; learner edits live in `AppData.promptOverrides` and win a backup merge. The Velona key is not AppData: it lives only under `skillmastery:ai-key` in localStorage and never enters a backup or export.
10. **Day cards are stored, rollups are derived.** `dayPlans[weekId]` holds the editorial layer; `summariseWeek`/`summariseSubject` are the only places that compute capacity, totals and overload. Never store a computed total.
11. **The clock is derived, the start date is stored.** `courseDay()`, `courseWeek()` and `consistency()` in `src/lib/courseClock.ts` read `journey`. A pause starts the next calendar day, so pausing never moves the course day backwards. Consistency is a ratio, never a streak.
12. **Marks are derived, never stored.** `milestonesFor()` in `src/engine/milestones.ts` reads checked tasks, passed gates and mastered nodes. A mark never counts days, sessions or streaks, so a pause cannot remove one. `journey.gameLayer` only hides the surface.

### Persistence

- IndexedDB database `skillmastery`, object store `state`, key `app-data-v1`. The legacy database `masteryharness` is migrated once.
- localStorage mirror: `skillmastery:data`, plus `skillmastery:theme` for the pre-paint boot script. The mirror never exceeds 5 MB (`LOCAL_MIRROR_CAP_MB`), whatever the stored threshold says.
- `prefs.storageGuardMB` (5–200 MB, default 20) warns in Settings when saved data passes the guard. It is advisory, because IndexedDB has no such ceiling; it never blocks a write.
- Boot: `loadPersisted()` chooses the newest valid copy; invalid data is quarantined and a fresh seed opens with an explicit warning.
- Autosave debounces 500ms, flushes on `pagehide` and visibility change, and mirrors immediately.
- Export is schema-validated on import. Replace and merge are different operations; merge keeps the higher book chapter, unions daily log items, and lets this device's prompt-skill edits win while incoming files only fill gaps.
- Undo history is **session-only**, 50 entries, and excludes preferences and navigation. It includes prompt-skill edits. Persisted reset checkpoints are a future feature; do not claim they exist.
- Undo also covers the course clock, day cards, track deletion and restore. Deleting a week records its nodes, cards and pruned graph edges in `trash`, so a restore reconnects the prerequisite graph.
- Seed upgrades are non-destructive: `refreshSeedContent()` refreshes authored weeks, preserves checks, gate attempts, notes, overrides and user-added weeks/items, and appends new seed resources without touching reading status or user-added links. Authored seed ids ending in `-cN` are replaced by matching day + active/passive task. Removed seed resources are never deleted.

### Migrations

- Schema change → bump `SCHEMA_VERSION`, add a `migrateAppData` step, keep a raw pre-migration backup, add tests, and verify an old export still imports.
- Schema v2 predates `promptOverrides`; migration adds `{}` without touching the rest of the payload. A v1 backup still gets estimates and planner defaults in the same pass.
- Schema v4 folds the four per-day capacity fields into two weekly totals, and adds `journey`, `dayPlans` and `trash`. A v3 payload keeps its real capacity; a payload with no planner gets today's defaults, not a conversion of old defaults. Seven study days force `bufferDay: null`.
- Schema v5 turns `ChecklistItem.day` into a day slot 1–7. A v4 payload stored Sunday as weekday `0`, so the migration maps `0 → 7`; a v5 payload keeps a missing day missing, and does not invent one.
- Authored content change → bump `SEED_VERSION` and update `refreshSeedContent` + `seedUpgrade.test.ts`. Do not wipe checks to refresh copy. New resources are additive; do not replace the resource array.
- Never reuse an old seed id for a different task or resource.

---

## 6. Content authoring

- Flutter Week 1: 15 tasks spread across all seven days, with seven authored day cards, written for a 13-year-old. Each day pairs passive input with active output.
- Every day card follows `docs/CONTENT-STYLE.md`: one idea, a five-minute start, one concrete example, a named failure and an observable check. `checkDayPlans()` in `src/content/style.ts` enforces the mechanical rules in tests.
- Week shape: Days 1–2 orient, 3–4 build/debug, 5 test, 6 apply, 7 buffer + checkpoint.
- Every week names an artefact (“You build”), a git habit, a one-sentence anchor, outcomes, rabbit holes, and a blind checkpoint. The blueprint carries three threads (Dart, Flutter, design) for all 24 weeks; a week page shows all three, and the Plan syllabus lists them together. A coding week without a design thread is a content bug.
- Git is threaded through the whole course: Week 1 first push, Week 2 branch + PR, every later week commit + push, Week 24 signed release tag.
- Estimates must fit the default capacity: 720 active / 420 passive per week across seven days, which is 103 / 60 per day. A week that cannot fit is a content bug, not a UI warning.
- Technical terms are defined on first use. “Go deeper” carries the compiler/runtime detail.
- `docs/source/flutter-24-week-plan.txt` is reference material. `src/data/curriculum/blueprint.ts` is the executable 24-week summary; keep them aligned when changing the route.
- The Full-Stack track follows the same schema and UI, but its copy may be more technical. Do not silently rewrite it while editing Flutter content.

---

## 7. UI rules

`DESIGN.md` is the contract. The short version:

- Board and paper. Fraunces for the one loud statement; Instrument Sans for everything else.
- One accent action per screen. If two elements are accent-filled, fix one.
- Related stats use `.ledger`; nested stats use `.mini-ledger`. Do not add a second layer of cards.
- 11px minimum text. No ALL-CAPS eyebrows. No middle-dot meta strings. No `→` appended to links.
- No gradients, glows, glass, hover lifts or fake urgency.
- 44px touch targets below 768px; visible focus states; icon-only buttons need `aria-label`.
- Use tokens from `src/index.css`; never hard-code a hex value in a component.
- Use `cn()` for conditional classes, `percent()` for ratios, `formatEstimate`/`formatTotal` for time.

When adding a view, update the router, the shell navigation, the command palette, and the mobile More sheet together. A view that exists only at a hash is not shipped.

---

## 8. Testing

- Engine logic, store actions, migrations, seed upgrades, storage, exports and the main smoke flow are covered. Keep it that way.
- Baseline: **223 tests / 30 files** (October 2026).
- Add tests for:
  - every new pure engine function;
  - every schema/seed migration;
  - backup import/export changes;
  - a UI flow that would silently lose data.
- Tests run in jsdom with `fake-indexeddb`; `src/test/setup.ts` installs the browser shims.
- UI tests use Testing Library and accessible roles/names. Prefer `getByRole('region', { name: 'Week totals' })` over CSS selectors.
- Do not snapshot the whole page; assert the behaviour the learner sees.
- `npm run build` is the final type-check; a passing `vitest` is not enough.

---

## 9. Deployment

- Push to `main` → Vercel builds `npm run build` and publishes `dist`.
- Project: `skillmastery` in team `jay-174b`.
- Production aliases: `skillmastery-jay.vercel.app`, `skillmastery-jay-174b.vercel.app`, `skillmastery-git-main-jay-174b.vercel.app`.
- After a push, verify:
  1. the deployment state is `READY`;
  2. the production alias points at that deployment;
  3. the live HTML references the same `assets/index-*.js` hash as `dist/index.html`;
  4. `POST /api/chat` with no key returns `401`, not the SPA HTML.
- `vercel.json` sets the SPA rewrite and no-cache headers for the shell, service worker and manifest. Fingerprinted assets are immutable.
- The build uses the relative base `./`; do not change it to `/` without testing a subpath deploy.
- There are no environment variables. The key must not become a server env var: the browser sends the device-local key to `/api/chat` per request, and the function forwards it without logging or storing it.
- Do not add GitHub Pages back. Do not add a second hosting provider.

### The AI proxy contract

- `api/chat.ts` is a stateless Vercel Node function. Exclude `/api/` from the SPA rewrite in `vercel.json` or the browser receives `index.html` instead of JSON. Verify a keyless `POST /api/chat` returns `401` after deployment.
- Fixed upstream `https://velona.in/v1/chat/completions`; fixed model `deepseek/deepseek-v4.1-flash-1017`. The browser cannot choose either. Changing either means changing `api/chat.ts`, `src/services/ai.ts` and the Help copy together.
- Validate the body: 1–20 non-empty messages, total prompt ≤ 120,000 characters, `max_tokens` ≤ 8,000, temperature within 0–1. Upstream timeout is 280s under `maxDuration = 300` (Hobby with Fluid compute allows it). The two request shapes share one proxy: a prompt skill is still capped at 24,000 characters and 1,200 tokens by the client, and the week writer at 120,000 and 8,000.
- Read the key from `Authorization: Bearer`, never a query string. Do not log it, echo it in an error, or include it in a response. Return normalized errors: `401` invalid key, `429` rate limited, `502` upstream unavailable, `504` timeout.
- The client stores the key under `skillmastery:ai-key` only. It is never exported, merged or backed up, and Settings has a visible **Forget key** action.
- Prompt skills are editable in `AppData.promptOverrides` (template cap 20,000 characters). The PromptHub shows the exact rendered prompt, character count and output cap; Run is disabled past 24,000 rendered characters. `runAi` takes `maxPromptChars` only for week generation; do not raise the prompt-skill ceiling without changing Help.
- Week generation is one call per week: `buildWeekBrief` → `buildGenerationPrompt` → `runAi` → `parseWeekGeneration` → `checkDayPlans` → explicit Save. `src/services/generateWeek.ts` owns the single in-flight request and the `AbortController`. A draft never enters the store on its own, Week 1 is never generated, and `driftFlags`/`coverageGaps` are advisory while `checkDayPlans` issues block Save.
- One in-flight request per tab, an explicit Cancel via `AbortController`, and no automatic retries that can multiply spend. Answers are not stored.
- No streaming. Add it only if the abort path and the token caps remain enforced.

---

## 10. Known traps

1. **`npm run build` runs `tsc -b` first.** A Vite-only build can hide type errors. Use the full script.
2. **Service-worker cache.** Visual checks against `vite preview` can serve a previous bundle. Clear the origin (`Storage.clearDataForOrigin`) or bump the query string before concluding a layout is broken.
3. **`captureBeyondViewport` lies.** It produced a fake 1280px clipping report. Resize the viewport to `scrollHeight`, then capture without that flag.
4. **Weekday indexing.** Sunday is `0`. A Monday-first display helper applied to stored data shifts every task by a day. Check both `schemaWeekday()` and `weekdayOf()`.
5. **Estimate formatting.** `formatEstimate` takes an `Estimate`; `formatTotal` takes an aggregate with `min`/`max`. Mixing them produces `0–0 min` or a falsely precise single number.
6. **Seed ids.** `fl-w1-c3`-style ids are regenerated on seed refresh. User-added ids use `uniqueId()` and must survive. Never hard-code a seed id in a test without going through the seed builder.
7. **Import replaces planner?** It must not. `importData('replace')` keeps the current theme and planner; `resetToSeed` keeps theme, mode and planner.
8. **Book merge direction.** Merge keeps the higher `currentChapter`; never move a learner backwards.
9. **PWA weight.** The precache is ~1.1 MB after fonts. Adding another font family or a large icon set will slow first install on the phone. Check the build output.
10. **`logo-mark` has no CSS rule.** It is a positioning hook, not a tile. Do not assume it paints a background.
11. **Boot and PWA colours are duplicated.** The inline boot styles in `index.html`, the theme-colour update in `AppShell`, and the manifest colours in `vite.config.ts` are not generated from CSS. When a palette token changes, update all three in the same commit.
12. **Old view aliases.** Removing `overview`, `curriculum`, `nodes`, `recall` or `vault` from the router breaks saved links and command-palette results.
13. **Do not edit `dist/`.** It is generated. Rebuild instead.
14. **Local preview port.** `npm run preview` uses `4173`; the dev server uses `5173`. Do not confuse them when testing the service worker.
15. **Two different “weeks”.** The learner's course week and the course's Week 17 release-signing lesson are not the same thing. Do not hard-code calendar dates.
16. **The AI key is not data.** It lives in localStorage under `skillmastery:ai-key`. Never put it in `AppData`, a seed, a test fixture, a screenshot or an export; never log it in the proxy.
17. **`/api/chat` must stay outside the SPA rewrite.** A rewrite of `/(.*)` makes the function unreachable. Keep `/((?!api/).*)` and test the 401 after every deployment.
18. **AnkiDroid takes TSV/CSV, not JSON.** JSON is only for re-importing generated cards into SkillMastery. Help and empty states must keep that distinction.

---

## 11. Roadmap

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Flutter CI, debug APKs, local-first foundation | Shipped |
| 2 | Schema v2, estimates, planner, undo, scoped resets | Shipped |
| 3 | Seven-view IA, command palette, mobile shell | Shipped |
| 4 | Authored Weeks 1–2, 24-week blueprint, Vercel-only hosting | Shipped |
| — | Board-and-paper design pass | Shipped (`53e8cab`) |
| 5 | Help expansion, resource library, AI proxy + prompt runner, legibility | Shipped |
| 6 | Guided course: start clock, pause, day cards, generation, syllabus, marks, trash | Built; deploy pending |
| 7 | Android/AnkiDroid companion and exact device setup | Later |
| — | Release signing and store delivery | Course content, Week 17; not app infrastructure |

Phase 5 must not add a backend account, cloud sync, or background daemon. The only server-side surface is the stateless AI proxy.

---

## 12. Definition of done

A change is done when:

- [ ] It follows `DESIGN.md` and the copy rules.
- [ ] New learner-facing content passes `checkDayPlans()` and `docs/CONTENT-STYLE.md`.
- [ ] `npx tsc -b`, `npm test`, `npm run lint` and `npm run build` pass.
- [ ] New engine or migration behaviour has a test.
- [ ] Existing backups, checks/notes and planner settings survive.
- [ ] A destructive action is recoverable from Recently deleted, with an explicit permanent delete.
- [ ] It works at 390px and 1280px, light and dark, with reduced motion.
- [ ] The service worker is cleared for the visual check.
- [ ] The deployment is READY and the production alias serves the new bundle hash.
- [ ] `README.md` or `DESIGN.md` is updated if behaviour or visual rules changed.

Commit style: imperative sentence, no prefix, explain the learner-visible change. Example: `Give SkillMastery a board-and-paper visual identity`.
