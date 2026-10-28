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

Two 24-week tracks are bundled (Flutter and Full-Stack Web). The Flutter track is the active teaching track. Weeks 1–2 are fully authored day plans written for a 13-year-old; Weeks 3–24 use the blueprint as a locked brief for later AI generation.

**Current state (October 2026):**

- Phases 1–4 are shipped: local-first foundation, schema v2 + estimates, the seven-view shell, and the reviewed Weeks 1–2 curriculum.
- The board-and-paper design pass is shipped (`53e8cab`).
- **Phase 5 is next and not implemented:** Help expansion, resource-library completion, the AI proxy + prompt runner, and remaining legibility follow-ups.
- The native Android/AnkiDroid companion is later. There is no Android project in this repo yet.

---

## 2. Non-negotiables

- **Vercel only.** No GitHub Pages workflow, no `gh-pages` branch, no second host. The live alias is `skillmastery-jay.vercel.app`.
- **Local-first.** No account, analytics, telemetry, cloud sync or runtime curriculum fetch. Progress lives in IndexedDB with a localStorage mirror.
- **No time tracking.** No timers, stopwatches, elapsed time, session countdowns or “time remaining”. Estimates are ranges; checking a task credits the whole range.
- **Days are derived.** A week's seven day plans come from each checklist item's `day` field. Never add a stored `dayPlan` array.
- **Weeks 1–2 are hand-authored.** Do not replace them with generated copy. Later weeks may be generated only through the blueprint brief and must be reviewed before they are treated as canonical.
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
npm test           # Vitest, currently 91 tests across 16 files
npm run lint       # oxlint
npx tsc -b         # type-check without emitting (also runs inside build)
npm run build      # tsc -b + Vite production build into dist/
npm run preview    # serve dist/ on http://localhost:4173
```

Before every push:

```bash
npx tsc -b && npm test && npm run lint && npm run build
```

`npm run lint` currently reports 15 pre-existing warnings and zero errors. Do not add new warnings. Do not silence a warning with a blanket disable.

---

## 4. Architecture map

```
api/                     Vercel serverless functions (none yet; Phase 5 adds /api/chat)
src/
  App.tsx                Route switch, hydration gate, global sheets
  main.tsx               Boot, autosave start, PWA registration
  components/
    layout/              AppShell, command palette, settings, track switcher, mobile More
    ui/                  Primitives, Sheet, Toaster
  data/
    tracks/              Authored subjects: weeks, nodes, cards, resources
    curriculum/          blueprint.ts: the static 24-week Flutter route
    seedData.ts          Fresh AppData seed
    prompts.ts           Editable prompt-skill templates
    books.ts, rhythm.ts  Shared canon and daily rhythm
  engine/                Pure logic: estimates, gating, SRS, FIRe, mastery, remediation
  features/              One folder per view: today, plan, map, practice, library, progress, help
  hooks/                 History-depth hooks
  lib/                   Router, dates, utilities (Anki export, downloads, cn/percent)
  services/              Storage, migrations, seed upgrade, history, exports, validation, install
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

Schema: `SCHEMA_VERSION = 2`, `SEED_VERSION = 2` in `src/types/schema.ts`.

`AppData` contains:

- `subjects[]` — each with phases, weeks, nodes, cards and resources.
- `books[]` — the shared 30-minute canon.
- `dailyLog`, `overrides`, `prefs`, `planner`.
- `activeSubjectId`, `schemaVersion`, `seedVersion`, timestamps.

Rules:

1. **Estimates** live on `ChecklistItem.estimate` (`{ min, max }`). A legacy `minutes` field is a fallback only. `estimateOf()` handles the fallback; `formatEstimate()` renders a task range; `formatTotal()` renders any aggregate.
2. **Completion credit.** Checking a task adds its full estimate range to the completed total for the day, week and course. The planned total stays fixed; unchecking removes the credit. Do not add a separate “actual time” field.
3. **Weekdays.** `Weekday` is `0 = Sunday … 6 = Saturday`, matching `Date.getDay()`. Use `schemaWeekday()` when writing checklist/planner data. Display strips are Monday-first; use `weekdayOf()` / the ordered helpers. Do not flip these by hand.
4. **Capacity** lives in `planner` and is device-local. Importing a backup must not replace it. `resetToSeed` keeps the current planner and theme.
5. **Gating.** A week opens when the previous week's gate passed, or when an audited override exists. A gate passes at average ≥ 4.0 with no category below 3. Never add a silent bypass.
6. **Mastery** is earned through the gate or a node review, not by checking a box. `markNodeMastered` must keep validating the gate.
7. **Cards** use the fixed ladder `1 / 3 / 6 / 10 / 7 days` (`SRS_INTERVALS`). `scheduleStep` indexes it; `dueAt` is epoch ms. Review grades map through `gradeCard`.
8. **Resources** are `docs | curriculum | article`; books are separate. Do not merge them into one entity.
9. **Prompt templates** are static today. If prompt overrides become user data, put them in `AppData` or a separately documented local store; never put the API key there.
10. **Day plans are read-only derivations.** `summariseWeek`/`summariseSubject` are the only places that compute day rollups.

### Persistence

- IndexedDB database `skillmastery`, object store `state`, key `app-data-v1`. The legacy database `masteryharness` is migrated once.
- localStorage mirror: `skillmastery:data`, plus `skillmastery:theme` for the pre-paint boot script.
- Boot: `loadPersisted()` chooses the newest valid copy; invalid data is quarantined and a fresh seed opens with an explicit warning.
- Autosave debounces 500ms, flushes on `pagehide` and visibility change, and mirrors immediately.
- Export is schema-validated on import. Replace and merge are different operations; merge keeps the higher book chapter and unions daily log items.
- Undo history is **session-only**, 50 entries, and excludes preferences and navigation. Persisted reset checkpoints are a future feature; do not claim they exist.
- Seed upgrades are non-destructive: `refreshSeedContent()` preserves checks, gate attempts, notes, overrides and user-added weeks/items. Authored seed ids ending in `-cN` are replaced by matching day + active/passive task.

### Migrations

- Schema change → bump `SCHEMA_VERSION`, add a `migrateAppData` step, keep a raw pre-migration backup, add tests, and verify an old export still imports.
- Authored content change → bump `SEED_VERSION` and update `refreshSeedContent` + `seedUpgrade.test.ts`. Do not wipe checks to refresh copy.
- Never reuse an old seed id for a different task.

---

## 6. Content authoring

- Flutter Weeks 1–2: 15 tasks each, spread across all seven days, written for a 13-year-old. Each day pairs passive input with active output.
- Week shape: Days 1–2 orient, 3–4 build/debug, 5 test, 6 apply, 7 buffer + checkpoint.
- Every week names an artefact (“You build”), a git habit, a one-sentence anchor, outcomes, rabbit holes, and a blind checkpoint.
- Git is threaded through the whole course: Week 1 first push, Week 2 branch + PR, every later week commit + push, Week 24 signed release tag.
- Estimates must fit the default capacity: weekday 90 active / 45 passive, weekend 120 / 60. A week that cannot fit is a content bug, not a UI warning.
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
- Baseline: **91 tests / 16 files**.
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
  3. the live HTML references the same `assets/index-*.js` hash as `dist/index.html`.
- `vercel.json` sets the SPA rewrite and no-cache headers for the shell, service worker and manifest. Fingerprinted assets are immutable.
- The build uses the relative base `./`; do not change it to `/` without testing a subpath deploy.
- There are no environment variables today. When the AI proxy lands, the key still must not become a server env var: the browser sends the device-local key to `/api/chat` per request, and the function forwards it without logging or storing it.
- Do not add GitHub Pages back. Do not add a second hosting provider.

### Adding the AI proxy (Phase 5 guardrails)

- Put the function at `api/chat.ts` (outside `src`; the app tsconfig does not include it). Exclude `/api/` from the SPA rewrite in `vercel.json` so the function is reachable.
- Fix the upstream to `https://velona.in/v1/chat/completions` and the model to `deepseek/deepseek-v4.1-flash-1017`. Do not accept a model or base URL from the browser.
- Validate the body: messages array, total prompt ≤ 24k characters, `max_tokens` ≤ 1200, temperature within 0–1, request timeout ~60s.
- Read the key from an `Authorization` header, never a query string. Do not log it, echo it in an error, or include it in a response.
- Return normalized errors: `401` invalid key, `429` rate limited, `5xx` upstream unavailable. The UI shows a plain sentence, not raw upstream JSON.
- The client stores the key under a dedicated local key (for example `skillmastery:ai-key`), not in `AppData`. It is never exported, never merged, and has a visible “Forget key” action.
- Prompt skills are editable; show the exact rendered prompt, character count and token cap before the first run. One in-flight request per tab; no automatic retries that can multiply spend.
- No streaming in the first version. Add it only if the abort path and token cap remain enforced.

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

---

## 11. Roadmap

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Flutter CI, debug APKs, local-first foundation | Shipped |
| 2 | Schema v2, estimates, planner, undo, scoped resets | Shipped |
| 3 | Seven-view IA, command palette, mobile shell | Shipped |
| 4 | Authored Weeks 1–2, 24-week blueprint, Vercel-only hosting | Shipped |
| — | Board-and-paper design pass | Shipped (`53e8cab`) |
| 5 | Help expansion, resource library, AI proxy + prompt runner, legibility | Next |
| 6 | Android/AnkiDroid companion and exact device setup | Later |
| — | Release signing and store delivery | Course content, Week 17; not app infrastructure |

Phase 5 must not add a backend account, cloud sync, or background daemon. The only server-side surface is the stateless AI proxy.

---

## 12. Definition of done

A change is done when:

- [ ] It follows `DESIGN.md` and the copy rules.
- [ ] `npx tsc -b`, `npm test`, `npm run lint` and `npm run build` pass.
- [ ] New engine or migration behaviour has a test.
- [ ] Existing backups, checks/notes and planner settings survive.
- [ ] It works at 390px and 1280px, light and dark, with reduced motion.
- [ ] The service worker is cleared for the visual check.
- [ ] The deployment is READY and the production alias serves the new bundle hash.
- [ ] `README.md` or `DESIGN.md` is updated if behaviour or visual rules changed.

Commit style: imperative sentence, no prefix, explain the learner-visible change. Example: `Give SkillMastery a board-and-paper visual identity`.
