/**
 * The authored 24-week route. Static curriculum metadata, not user data:
 * it never enters IndexedDB, so it needs no schema migration.
 *
 * Weeks 1–2 are backed by fully written checklists. Weeks 3–24 use the same
 * seven-day shape and become the locked brief for AI generation later.
 */
export interface WeekBlueprint {
  weekNumber: number
  phaseId: string
  /** Plain-language theme a 13-year-old can repeat back. */
  theme: string
  /** The artefact that exists at the end of the week. */
  project: string
  /** The git habit for the week. */
  git: string
  /** Closed-book proof, in plain words. */
  checkpoint: string
  /** Monday → Sunday focus. Index 0 is Monday. */
  days: readonly [string, string, string, string, string, string, string]
}

export const FLUTTER_BLUEPRINT: readonly WeekBlueprint[] = [
  {
    weekNumber: 1,
    phaseId: 'fl-p1',
    theme: 'First Dart program: money, types and null',
    project: 'Pocket-money ledger that prints a receipt',
    git: 'Create the repo, first commit, push to GitHub',
    checkpoint: 'Rebuild the ledger without notes',
    days: ['Read variables', 'First Dart file', 'Safe parsing', 'Build the ledger', 'Nasty inputs', 'Receipt + push', 'Blind rebuild'],
  },
  {
    weekNumber: 2,
    phaseId: 'fl-p1',
    theme: 'Functions, lists and a snack-shop dashboard',
    project: 'Snack-shop report with totals and a best seller',
    git: 'Branch, pull request, merge',
    checkpoint: 'Zero-loop analytics engine',
    days: ['Closures', 'List pipeline', 'Value equality', 'Dashboard', 'Break the Set', 'Timing + PR', 'Blind engine'],
  },
  {
    weekNumber: 3,
    phaseId: 'fl-p1',
    theme: 'Records, patterns and states that cannot lie',
    project: 'Order state machine with impossible states removed',
    git: 'Tag the working version v0.1',
    checkpoint: 'Sealed order pipeline',
    days: ['Records', 'Patterns', 'State map', 'Sealed machine', 'Impossible states', 'Async trace', 'Blind pipeline'],
  },
  {
    weekNumber: 4,
    phaseId: 'fl-p1',
    theme: 'Design that feels obvious: hierarchy, spacing, colour',
    project: 'Wireframe and design tokens for an order screen',
    git: 'Commit the token file on its own branch',
    checkpoint: 'Annotated wireframe + error state',
    days: ['Gestalt', 'Spacing scale', 'Wireframe', 'Build tokens', 'Dark-mode shadows', 'Contrast audit', 'Closed-book screen'],
  },
  {
    weekNumber: 5,
    phaseId: 'fl-p1',
    theme: 'How Flutter lays out a screen',
    project: 'Split-view screen that works on phone and TV',
    git: 'Commit the layout spike, then merge',
    checkpoint: 'Constraint trace + adaptive screen',
    days: ['Three trees', 'Read constraints', 'Tree sketch', 'Adaptive build', 'Unbounded errors', 'Width tests', 'Blind trace'],
  },
  {
    weekNumber: 6,
    phaseId: 'fl-p1',
    theme: 'A design system you can reuse',
    project: 'Twelve-component finance UI kit with light and dark themes',
    git: 'Release v0.2 with README and screenshots',
    checkpoint: 'Capstone 2: design system',
    days: ['ThemeExtension', 'Breakpoints', 'Component list', 'Build the kit', 'Text scaling', 'Semantics pass', 'Capstone audit'],
  },
  {
    weekNumber: 7,
    phaseId: 'fl-p2',
    theme: 'State that has one owner',
    project: 'Cart and counter with Riverpod, no duplicated state',
    git: 'PR: move state out of widgets',
    checkpoint: 'State ownership map',
    days: ['State types', 'ProviderScope', 'Ownership map', 'Refactor cart', 'Scoped rebuilds', 'Test the flow', 'Blind refactor'],
  },
  {
    weekNumber: 8,
    phaseId: 'fl-p2',
    theme: 'Waiting, cancelling and searching',
    project: 'Search screen with debounce and cancellation',
    git: 'Commit the async spike with its test',
    checkpoint: 'Async search under fake_async',
    days: ['AsyncValue', 'Cancellation', 'Race sketch', 'Search build', 'Stale results', 'Debounce test', 'Blind search'],
  },
  {
    weekNumber: 9,
    phaseId: 'fl-p2',
    theme: 'Routes, deep links and the back button',
    project: 'Three-tab app with a shareable profile link',
    git: 'PR: route table + redirect guard',
    checkpoint: 'Deep-link walkthrough',
    days: ['Route graph', 'Shell routes', 'URL map', 'Tabbed shell', 'Bad links', 'Restore state', 'Blind routing'],
  },
  {
    weekNumber: 10,
    phaseId: 'fl-p2',
    theme: 'Talking to a server without breaking',
    project: 'API client with retries, timeouts and friendly errors',
    git: 'Commit the client and its error tests',
    checkpoint: 'Failure-mode matrix',
    days: ['Dio basics', 'Interceptors', 'Error map', 'Client build', 'Timeout drill', 'Retry tests', 'Blind client'],
  },
  {
    weekNumber: 11,
    phaseId: 'fl-p2',
    theme: 'Login that stays logged in',
    project: 'JWT login with secure storage and silent refresh',
    git: 'PR: auth flow, no secrets committed',
    checkpoint: 'Expired-token walkthrough',
    days: ['Token lifecycle', 'Secure storage', 'Auth flow', 'Login build', 'Expired token', 'Refresh race', 'Blind auth'],
  },
  {
    weekNumber: 12,
    phaseId: 'fl-p2',
    theme: 'Live data without draining the battery',
    project: 'Real-time dashboard over WebSocket and SSE',
    git: 'Tag v0.3 connected app',
    checkpoint: 'Capstone 3: real-time terminal',
    days: ['WebSockets', 'SSE', 'Stream map', 'Live dashboard', 'Reconnect drill', 'Backpressure', 'Capstone demo'],
  },
  {
    weekNumber: 13,
    phaseId: 'fl-p3',
    theme: 'Data that survives closing the app',
    project: 'SQLite inventory with reactive queries',
    git: 'PR: schema + migration',
    checkpoint: 'Query plan + migration',
    days: ['Tables + keys', 'Drift setup', 'Schema sketch', 'Inventory build', 'Bad migration', 'Query plans', 'Blind queries'],
  },
  {
    weekNumber: 14,
    phaseId: 'fl-p3',
    theme: 'Code that stays easy to change',
    project: 'Feature-first refactor of the inventory app',
    git: 'PR: folders + repository boundary',
    checkpoint: 'Dependency-rule audit',
    days: ['Dependency rule', 'Repositories', 'Folder map', 'Refactor feature', 'Leaky imports', 'Boundary tests', 'Blind refactor'],
  },
  {
    weekNumber: 15,
    phaseId: 'fl-p3',
    theme: 'Offline first: sync without losing work',
    project: 'Outbox, optimistic UI and conflict rules',
    git: 'PR: outbox transaction test',
    checkpoint: 'Capstone 4: offline inventory',
    days: ['Outbox', 'Optimism', 'Conflict rules', 'Offline build', 'Duplicate sends', 'Replay test', 'Capstone demo'],
  },
  {
    weekNumber: 16,
    phaseId: 'fl-p3',
    theme: 'A database with rules',
    project: 'Postgres schema with row-level security',
    git: 'Commit SQL migrations, never credentials',
    checkpoint: 'RLS policy test',
    days: ['Postgres', 'RLS', 'Tenant sketch', 'Policy build', 'Cross-tenant read', 'Policy tests', 'Blind policies'],
  },
  {
    weekNumber: 17,
    phaseId: 'fl-p3',
    theme: 'Two-way sync that heals itself',
    project: 'Delta pull, realtime updates and tombstones',
    git: 'Tag v0.4 sync engine',
    checkpoint: 'Conflict replay',
    days: ['Cursors', 'CDC', 'Sync map', 'Delta pull', 'Deleted rows', 'Replay drill', 'Blind sync'],
  },
  {
    weekNumber: 18,
    phaseId: 'fl-p3',
    theme: 'Heavy work off the UI thread',
    project: 'Background import with isolates and progress',
    git: 'PR: isolate benchmark',
    checkpoint: 'Frame-time budget',
    days: ['Isolates', 'Messages', 'Work split', 'Import build', 'Jank drill', 'Benchmark', 'Blind isolate'],
  },
  {
    weekNumber: 19,
    phaseId: 'fl-p4',
    theme: 'Long lists that stay smooth',
    project: 'Sliver feed with sticky headers and ten thousand rows',
    git: 'PR: sliver rewrite',
    checkpoint: 'Scroll profile',
    days: ['Slivers', 'Viewports', 'Feed plan', 'Sliver build', 'Scroll jank', 'Frame profile', 'Blind slivers'],
  },
  {
    weekNumber: 20,
    phaseId: 'fl-p4',
    theme: 'Charts and drawing by hand',
    project: 'Interactive chart with hit testing',
    git: 'Commit the painter + golden tests',
    checkpoint: 'Chart interaction',
    days: ['Canvas', 'Paths', 'Chart sketch', 'Painter build', 'Hit-test bugs', 'Golden tests', 'Blind chart'],
  },
  {
    weekNumber: 21,
    phaseId: 'fl-p4',
    theme: 'Motion that explains, not decorates',
    project: 'Spring transitions, Hero and a Rive state machine',
    git: 'PR: motion tokens',
    checkpoint: '60fps motion audit',
    days: ['Implicit motion', 'Springs', 'Motion script', 'Hero build', 'Dropped frames', 'Timing audit', 'Blind motion'],
  },
  {
    weekNumber: 22,
    phaseId: 'fl-p4',
    theme: 'Tests that catch real mistakes',
    project: 'Unit, widget and golden test pyramid',
    git: 'CI runs tests on every push',
    checkpoint: 'Coverage + accessibility gates',
    days: ['Unit tests', 'Widget tests', 'Test plan', 'Write the pyramid', 'Brittle tests', 'CI gates', 'Blind test plan'],
  },
  {
    weekNumber: 23,
    phaseId: 'fl-p4',
    theme: 'Fast, small and shippable',
    project: 'Profile a release build and cut frame and memory waste',
    git: 'Tag release candidate v1.0',
    checkpoint: 'Release build report',
    days: ['Frame budget', 'Impeller', 'Perf plan', 'Profile build', 'Memory leak', 'Release build', 'Blind profile'],
  },
  {
    weekNumber: 24,
    phaseId: 'fl-p4',
    theme: 'Ship it and explain it',
    project: 'Store-ready build, runbook and architecture defence',
    git: 'Merge to main + signed release tag',
    checkpoint: 'Capstone 6: flagship',
    days: ['Scope the RFC', 'Runbook', 'Release checklist', 'Cut the build', 'Failure drill', 'Handover', 'Architecture defence'],
  },
]

export function blueprintFor(weekNumber: number): WeekBlueprint | undefined {
  return FLUTTER_BLUEPRINT.find((entry) => entry.weekNumber === weekNumber)
}
