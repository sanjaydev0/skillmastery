# MasteryHarness

An offline-first learning command center for deliberate practice, mastery gates, and long-term retention. Two 24-week curricula are included: **Flutter, Dart & High-Craft UI/UX** and **Full-Stack Web, Product Design & Systems**. Every bit of progress lives in your browser.

**Live app:** <https://sanjaydev0.github.io/masteryharness/>

## What it does

- **Overview** — today's active week, daily rhythm, graph mastery, gates cleared, recall queue, repair drills, canon reading, and a prompt of the day.
- **Curriculum** — 24-week phase maps, browser-local print/PDF export, week detail sheets, checklist work, 4-score blind gates, and add-week flows.
- **Knowledge Nodes** — a prerequisite graph with Primitive → Concept → Failure Mode knowledge points, freshness, repair flags, and a slide-over editor.
- **Recall** — an Anki-style manager with a fixed 1 / 3 / 6 / 10 / weekly SRS ladder, AI-JSON import, TSV/CSV export, and a context-aware prompt hub.
- **Vault** — docs, community curricula, the shared 30-minute book canon, and editable reading progress.
- **Command palette** — `Cmd/Ctrl+K` searches weeks, nodes, cards, resources, and books across every track.
- **Settings** — light/dark/system theme, passive/active study mode, install-to-home-screen prompt, storage status, persistent-storage request, validated JSON backup restore, Obsidian Markdown export, and reset-to-seed.
- **Installable PWA** — a standalone Android/iOS home-screen app with an offline app shell, cached routes, maskable icons, app shortcuts, and explicit install instructions.

### Mastery rules, not checkboxes

- A week opens only after the previous week's blind gate has passed (or an audited override is recorded).
- A node opens only when its week is open **and** every direct prerequisite is mastered.
- A gate passes only when the average is **≥ 4.0** with no category below **3**.
- FIRe gives fractional implicit credit to encompassed nodes: +0.5 strength (cap 5), interval ×1.5 (cap 120 days), 12-hour cooldown. It never marks a node mastered.
- Two failures on one knowledge point put the node into repair and flag its direct prerequisites for a 30-minute repair drill.

## Stack

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS 4 · Zustand 5 · IndexedDB (`idb-keyval`) with a localStorage mirror · Zod backup validation · `vite-plugin-pwa` · Vitest + Testing Library.

The seeded content is plain TypeScript under `src/data/`. The app has no backend, accounts, analytics, or runtime data requests.

## Local development

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm test             # 48 engine, store, seed, export and UI smoke tests
npm run lint
npm run build        # PWA production build in dist/
npm run preview
```

The production build uses the relative base `./`, so the exact same `dist/` works at a host root (Vercel, Cloudflare Pages, a custom domain) or under a repository subpath (GitHub Pages). Set `VITE_BASE=/some/path/` only if you deliberately need an absolute base.

## Local-first data

- IndexedDB is the primary store; localStorage is a second copy and a last-chance mirror on `pagehide`.
- On boot the newest valid copy (by `updatedAt`) wins. Invalid data is quarantined in localStorage and a fresh seed opens with an explicit warning.
- The header's **● Saved offline** indicator reflects actual write success, not a timer or network state.
- JSON backups are schema-validated before import and can replace all data or merge by id.
- Obsidian export writes Markdown frontmatter, phases, weeks, knowledge nodes, recall cards, canon progress, and vault resources.

Export a JSON backup before clearing browser storage or changing devices. There is no cloud copy.

## Install as an Android app

1. Open the HTTPS deployment (or `localhost`) in Chrome on Android.
2. Use **Settings → Install app**, or Chrome's **⋮ → Add to Home screen / Install app**.
3. Launch the icon like a native app. The service worker caches the app shell on first load; later opens and hash-route refreshes work fully offline. Your learning data is already local.

The manifest declares `display: standalone`, relative `start_url`/`scope`, 192/512 icons, a maskable icon, theme colours, and Recall/Curriculum shortcuts. `Page.getInstallabilityErrors` reports zero errors at both a host root and a GitHub Pages subpath; offline reloads of `#/recall` were verified in both cases.

## Hosting and refresh safety

The app uses hash routing (`#/overview`, `#/recall`, …), so a refresh never sends a missing path to the host. The repository also includes defence in depth for static hosts:

- `vercel.json` — Vercel build settings, catch-all SPA rewrite, and no-cache headers for `sw.js`, `registerSW.js`, `manifest.webmanifest`, and `index.html`.
- `public/_redirects` — Cloudflare Pages / Netlify SPA fallback (`/* /index.html 200`). Existing files take precedence, so `sw.js` and fingerprinted assets are never swallowed.
- `public/_headers` — Cloudflare Pages cache and MIME safety headers.
- `.github/workflows/pages.yml` — test, build, and deploy the relative-base build to GitHub Pages.

For Vercel, import the repository and keep the detected Vite settings (build `npm run build`, output `dist`); `vercel.json` also states them explicitly. For Cloudflare Pages, use build command `npm run build` and output directory `dist`. No environment variables are required for either.

## Seed provenance

The Flutter curriculum was authored from the source plan preserved at [`docs/source/flutter-24-week-plan.txt`](docs/source/flutter-24-week-plan.txt). The full-stack track lives in the same typed seed format alongside it.

## Deployment

Pushes to `main` run the test suite, build the PWA, and deploy `dist/` to GitHub Pages through `.github/workflows/pages.yml`. Enable **Settings → Pages → Source: GitHub Actions** once for the repository.

## Project map

```text
src/
  components/       layout, sheets, primitives
  data/             seed tracks, books, prompts, starter helpers
  engine/           gating, FIRe, remediation, mastery gates, SRS, search
  features/         Overview, Curriculum, Nodes, Recall, Vault
  lib/              hash router, date and export utilities
  services/         IndexedDB/localStorage, validation, save status
  store/            Zustand state and persisted actions
  test/             Vitest setup
```
