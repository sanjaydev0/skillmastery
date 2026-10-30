# SkillMastery

An offline-first command centre for a six-month Flutter, Dart and UI/UX course. It is the dashboard, not the classroom: it tells you what to do today, keeps the estimate honest, and points you at the real work.

**Live app:** <https://skillmastery-jay.vercel.app/>

Two 24-week tracks are bundled — **Flutter, Dart & High-Craft UI/UX** and **Full-Stack Web, Product Design & Systems** — and you can add a custom track for anything else. Progress lives only in your browser.

## What it does

- **Today** — the current week, only today's tasks, one clear "up next" action, review count, and a seven-day completion strip.
- **Plan** — phases and weeks, per-week estimate totals, honest overload warnings, editable weekly capacity for active and passive work, and a syllabus that names the Dart, Flutter and design thread of every week.
- **Week pages** — seven day cards for every day slot, a plain-language "you build" brief, the three threads, the git habit, outcomes, and the checkpoint. Week 1 is authored; a later week can be written from its blueprint, reviewed and then saved.
- **Map** — a prerequisite knowledge graph with Primitive → Concept → Failure Mode points, freshness and repair drills.
- **Practice** — the SRS queue, Anki-compatible deck, and editable prompt skills. An optional Velona key enables a same-origin prompt runner.
- **Library** — docs, the shared 30-minute canon, reading progress, saved links and a six-step open-source pathway from a public repository to a v1.0.0 release.
- **Progress** — completed estimate ranges, phase rollups, checkpoints, concept mastery, and optional evidence marks.
- **Progress marks** — optional evidence marks (first checkpoint, ten tasks, ten concepts) that never count days or streaks. Turn them off in Settings.
- **Recently deleted** — every week or track you delete waits in a 20-item trash. Restore brings back its concepts, cards and graph edges; removal there is permanent.
- **Help** — contextual answers for the actual setup: Zed, Flutter CLI, a physical phone, GitHub, backups, undo, exact AnkiDroid TSV import steps and the optional AI helper.
- **Command palette** — `Cmd/Ctrl+K` searches weeks, nodes, cards, resources and books across every track.
- **Installable PWA** — offline app shell, cached routes, maskable icons and explicit Android install steps.

### Planning rules, not timers

- Every task carries an estimate range. Checking it credits the whole range to the day, week and course; unchecking removes it. No timer runs in the background.
- The checklist is the evidence layer: its `day` fields place every task. A stored day card supplies the explanation, the steps and the design note. Only a checked task earns credit.
- A day over capacity is flagged instead of silently stretched. Capacity is two weekly totals split across your study days, stored on the device and never overwritten by an imported backup.
- The course has a real clock: Day 1 is the date you press Start. Pausing freezes the day count until you resume, so a missed week never makes the course jump ahead.
- The week has a shape: Days 1–2 orient, 3–4 build and debug, 5 test, 6 apply, 7 buffer and checkpoint.
- Every passive block is paired with an active output; the active share rises from roughly 45/55 to 70/30 over six months.
- A week opens only after the previous week's blind checkpoint passes, or an audited override is recorded.
- A checkpoint passes at an average of **≥ 4.0** with no category below **3**.
- Deleting is recoverable. A week or track goes to Recently deleted, and restoring it reconnects the prerequisite graph. Only an explicit permanent delete removes it.

## Project docs

- [`DESIGN.md`](DESIGN.md) — the visual and copy contract: board-and-paper palette, typography, components, data-display rules and review checklist.
- [`AGENTS.md`](AGENTS.md) — engineering contract for contributors and AI agents: architecture, data invariants, migrations, testing, deployment and the AI proxy contract.
- [`docs/CONTENT-STYLE.md`](docs/CONTENT-STYLE.md) — the day-card standard: plain instructional English, low working-memory load, fixed field budgets and the executable checks.

## Stack

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS 4 · Zustand 5 · IndexedDB (`idb-keyval`) with a localStorage mirror · Zod backup validation · `vite-plugin-pwa` · Vitest + Testing Library.

The seeded content is plain TypeScript under `src/data/`. The only server-side code is a stateless `/api/chat` proxy for the optional AI helper. There is no account, analytics, telemetry or runtime curriculum request, and the AI key stays in the browser.

## Local development

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm test             # engine, store, seed, storage, export and UI smoke tests
npm run lint
npm run build        # PWA production build in dist/
npm run preview
```

The production build uses the relative base `./`, so `dist/` also works at a host root or under a subpath.

## Content layout

- `src/data/tracks/flutterWeeks1to6.ts` — Week 1 is fully authored: 15 tasks and seven day cards for a 13-year-old. Week 2 keeps its authored task list; Weeks 3–6 keep the technical authoring.
- `src/data/curriculum/blueprint.ts` — the 24-week route: three threads (Dart, Flutter, design), knowledge points, project, git habit, checkpoint and seven day focuses. Week 1 is backed by real checklists and day cards; later weeks use the blueprint as the locked brief for AI generation.
- `src/data/tracks/` — the remaining Flutter and full-stack weeks, nodes, cards and resources.
- Git is part of the course, not an afterthought: Week 1 ends with a first push, Week 2 with a branch and pull request, every later week with a commit and push, and Week 24 with a signed release tag.

## Local-first data

- IndexedDB is the primary store; localStorage is a second copy and a last-chance mirror on `pagehide`.
- On boot the newest valid copy wins. Invalid data is quarantined and a fresh seed opens with an explicit warning.
- JSON backups are schema-validated before import and can replace all data or merge by id. They include prompt-skill edits; they never include the Velona key.
- A seed-version upgrade refreshes authored curriculum text, day plans and new resources without wiping checks, checkpoint history, notes, reading status or user-added weeks and links.
- Upgrading from the pre-rename build? The old namespace is detected and migrated on first boot.
- Obsidian export writes Markdown frontmatter, phases, weeks, knowledge nodes, recall cards, canon progress and resources.

The optional AI key is stored separately under `skillmastery:ai-key` in this browser. It is sent only to the same-origin `/api/chat` proxy when you press **Run prompt** or, on a later week, **Write the seven cards**; **Forget key** removes it.

Export a JSON backup before clearing browser storage or changing devices. There is no cloud copy.

## Install as an Android app

1. Open <https://skillmastery-jay.vercel.app/> in Chrome on Android.
2. Use **Settings → Install app**, or Chrome's **⋮ → Add to Home screen / Install app**.
3. Launch the icon like a native app. The service worker caches the shell on first load; later opens and hash-route refreshes work offline.

## Hosting

Vercel builds `main` on every push (`npm run build`, output `dist`). `vercel.json` also states the build settings, the SPA rewrite (excluding `/api/`), and no-cache headers for `sw.js`, `registerSW.js`, `manifest.webmanifest` and `index.html`; fingerprinted assets are immutable.

`npm test`, `npm run lint` and `npm run build` must pass before a push. There are no environment variables: the browser sends its device-local Velona key to `/api/chat` per request.

## Project map

```text
api/
  chat.ts           stateless Velona proxy for the optional prompt runner
src/
  components/       layout, sheets, primitives
  data/             seed tracks, 24-week blueprint, books, prompts
  engine/           estimates, gating, FIRe, remediation, mastery, SRS, search
  features/         today, plan, nodes, recall, vault, progress, help
  lib/              hash router, dates, export utilities
  services/         storage, validation, seed upgrades, history, save status, AI client
  store/            Zustand state and persisted actions
  test/             Vitest setup
```
