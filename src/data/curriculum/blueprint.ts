/**
 * The authored 24-week route, extracted from
 * `docs/source/flutter-24-week-plan.txt` (the long-form human source).
 *
 * This file is static curriculum metadata, not user data: it never enters
 * IndexedDB, so it needs no schema migration.
 *
 * Every week carries three threads — Dart, Flutter and design — so no week is
 * purely a language lesson or purely a framework lesson. The knowledge points
 * (primitive → concept → failure mode) are what the AI generator reads to stay
 * on the brief; losing them is what makes generated weeks drift.
 */
export interface WeekKnowledgePoint {
  /** The low-level mechanism. */
  primitive: string
  /** What it means, in one sentence. */
  concept: string
  /** The mistake this concept exists to prevent. */
  failureMode: string
}

export interface WeekBlueprint {
  weekNumber: number
  phaseId: string
  /** Plain-language theme a 13-year-old can repeat back. */
  theme: string
  /** Language / runtime thread. */
  dart: string
  /** Framework thread. */
  flutter: string
  /** Visual craft thread. Attaches to this week's artefact. */
  design: string
  /** The artefact that exists at the end of the week. */
  project: string
  /** The git habit for the week. */
  git: string
  /** Closed-book proof, in plain words. */
  checkpoint: string
  knowledgePoints: readonly WeekKnowledgePoint[]
  /** Terms this week introduces. Later weeks must not redefine them. */
  termsIntroduced: readonly string[]
  /** Weeks that must be passed first. */
  prerequisites: readonly number[]
  /** Monday → Sunday focus. Index 0 is Monday. */
  days: readonly [string, string, string, string, string, string, string]
}

export const FLUTTER_BLUEPRINT: readonly WeekBlueprint[] = [
  {
    weekNumber: 1,
    phaseId: 'fl-p1',
    theme: 'First Dart program: money, types and null',
    dart: 'Bindings, final vs const, sound null safety, type promotion, guard clauses',
    flutter: 'What a Flutter project is made of: lib/, pubspec.yaml, one main(), and why Dart comes first',
    design: 'One number owns the screen: a receipt has a single primary figure and everything else is muted',
    project: 'Pocket-money ledger that prints a receipt',
    git: 'Create the repo, first commit, push to GitHub',
    checkpoint: 'Rebuild the ledger without notes',
    knowledgePoints: [
      {
        primitive: 'Stack bindings pointing at heap objects',
        concept:
          'final locks the reference, const freezes the whole object graph at compile time and canonicalises identical instances',
        failureMode: 'Calling add() on a final list, then wondering why the UI never noticed the change',
      },
      {
        primitive: 'Bifurcated type hierarchy (Object vs Object?)',
        concept:
          'A null check promotes a local nullable value to non-nullable, so the compiler proves safety before you dereference it',
        failureMode: 'Sprinkling ! on parsed input until a null arrives and crashes the screen',
      },
      {
        primitive: 'Null-aware operators and early-return guards',
        concept:
          'Flatten nested checks into linear guard clauses so invalid input exits at the top of the function',
        failureMode: 'Building an arrow-shaped if pyramid that nobody can read six weeks later',
      },
    ],
    termsIntroduced: ['binding', 'reference', 'heap', 'final', 'const', 'null safety', 'type promotion', 'guard clause'],
    prerequisites: [],
    days: ['Read variables', 'First Dart file', 'Safe parsing', 'Build the ledger', 'Nasty inputs', 'Receipt + push', 'Blind rebuild'],
  },
  {
    weekNumber: 2,
    phaseId: 'fl-p1',
    theme: 'Functions, lists and a snack-shop dashboard',
    dart: 'First-class functions, lexical closures, lazy Iterable pipelines, composition over inheritance, value equality',
    flutter: 'build() is a function returning a tree — the composition rules you learn here are the ones every widget uses',
    design: 'A report reads top-left to bottom-right: the best seller is the anchor, the rest is supporting evidence',
    project: 'Snack-shop report with totals and a best seller',
    git: 'Branch, pull request, merge',
    checkpoint: 'Zero-loop analytics engine',
    knowledgePoints: [
      {
        primitive: 'Functions as values with captured lexical scope',
        concept:
          'A closure keeps the variables it references alive, which is how a callback can remember a counter without a class',
        failureMode: 'Capturing a loop variable and getting the final value in every callback',
      },
      {
        primitive: 'Lazy Iterable vs eager List',
        concept:
          'map/where return lazy views that run once on demand, while toList() materialises and allocates immediately',
        failureMode: 'Chaining five lazy transforms over the same list and traversing it five times',
      },
      {
        primitive: 'implements, mixin and operator == / hashCode',
        concept:
          'Compose behaviour from small interfaces and mixins instead of deep extends chains, and define value equality so objects compare by content',
        failureMode: 'Comparing two identical domain objects with == and getting false, then debugging the wrong layer',
      },
    ],
    termsIntroduced: ['closure', 'higher-order function', 'lazy evaluation', 'Iterable', 'mixin', 'value equality', 'hashCode'],
    prerequisites: [1],
    days: ['Closures', 'List pipeline', 'Value equality', 'Dashboard', 'Break the Set', 'Timing + PR', 'Blind engine'],
  },
  {
    weekNumber: 3,
    phaseId: 'fl-p1',
    theme: 'Records, patterns and states that cannot lie',
    dart: 'Records, destructuring patterns, sealed classes, exhaustive switch, Future/async, microtask ordering',
    flutter: 'An async gap invalidates context: why setState after await needs a mounted check',
    design: 'Every impossible state you delete from the model is a screen state you never have to design',
    project: 'Order state machine with impossible states removed',
    git: 'Tag the working version v0.1',
    checkpoint: 'Sealed order pipeline',
    knowledgePoints: [
      {
        primitive: 'Records and structural patterns',
        concept:
          'A record groups fixed, typed values; a pattern destructures it in place without intermediate variables',
        failureMode: 'Returning positional records from public APIs, then reordering fields and silently swapping values',
      },
      {
        primitive: 'sealed class hierarchies',
        concept:
          'A sealed supertype lets the compiler prove a switch covers every case, so a new state becomes a compile error rather than a runtime surprise',
        failureMode: 'Modelling status as a String and discovering the typo only when production shows a blank screen',
      },
      {
        primitive: 'Single-threaded event loop with microtask and event queues',
        concept:
          'await resumes on a microtask before the next event, so ordering is deterministic but not the order you wrote',
        failureMode: 'Assuming two unawaited futures finish in the order they were created',
      },
    ],
    termsIntroduced: ['record', 'pattern matching', 'destructuring', 'sealed class', 'exhaustive switch', 'microtask', 'event loop'],
    prerequisites: [2],
    days: ['Records', 'Patterns', 'State map', 'Sealed machine', 'Impossible states', 'Async trace', 'Blind pipeline'],
  },
  {
    weekNumber: 4,
    phaseId: 'fl-p1',
    theme: 'Design that feels obvious: hierarchy, spacing, colour',
    dart: 'Pure functions for layout maths: spacing scales and contrast ratios computed, not guessed',
    flutter: 'Nothing yet — this week is Figma-scale thinking before a single widget exists',
    design:
      'Gestalt grouping, an 8pt spatial grid, an optical type scale, semantic colour roles and the five mandatory UI states',
    project: 'Wireframe and design tokens for an order screen',
    git: 'Commit the token file on its own branch',
    checkpoint: 'Annotated wireframe + error state',
    knowledgePoints: [
      {
        primitive: 'Pre-attentive visual processing under 200ms',
        concept:
          'The eye groups by proximity, similarity and common region before it reads a single word, so spacing carries more meaning than borders',
        failureMode: 'Equal weight, equal size and a border around every box, producing a screen where nothing leads',
      },
      {
        primitive: 'Device-independent pixels on a base-8 progression',
        concept:
          'Every margin, padding and height snaps to 4/8/16/24/32/48, and every touch target keeps at least a 48dp hit area',
        failureMode: 'Magic numbers like 13.5 and 29 that misalign baselines on every device and shrink tap targets',
      },
      {
        primitive: 'Semantic colour roles over raw hex values',
        concept:
          'Primitive palette values map to roles (surface, onSurface, primary, error) so dark mode inverts by luminance instead of by inversion',
        failureMode: 'Designing only the happy path, then inventing error and offline states at implementation time',
      },
    ],
    termsIntroduced: ['Gestalt', 'proximity', 'common region', '8pt grid', 'type scale', 'semantic token', 'contrast ratio', 'UI state'],
    prerequisites: [3],
    days: ['Gestalt', 'Spacing scale', 'Wireframe', 'Build tokens', 'Dark-mode shadows', 'Contrast audit', 'Closed-book screen'],
  },
  {
    weekNumber: 5,
    phaseId: 'fl-p1',
    theme: 'How Flutter lays out a screen',
    dart: 'Immutable configuration objects and why rebuilding them is cheap',
    flutter: 'Widget, Element and RenderObject trees, keys, and the box constraint protocol',
    design: 'A layout that survives 320px is a layout that was designed as a set of rules, not a picture',
    project: 'Split-view screen that works on phone and TV',
    git: 'Commit the layout spike, then merge',
    checkpoint: 'Constraint trace + adaptive screen',
    knowledgePoints: [
      {
        primitive: 'Three parallel trees (Widget → Element → RenderObject)',
        concept:
          'Widgets are disposable configuration, Elements hold identity and state, RenderObjects own layout and paint',
        failureMode: 'Rebuilding a widget and expecting its State to reset, or reusing a key that makes it reset instead',
      },
      {
        primitive: 'BoxConstraints with min/max width and height',
        concept:
          'Constraints flow down and sizes flow up; a parent can tighten, loosen or leave a child unbounded, and only one of those is safe',
        failureMode: 'An unbounded-height ListView inside a Column, throwing the hasSize error at runtime',
      },
      {
        primitive: 'Row/Column flex algorithm',
        concept:
          'Expanded and Flexible distribute leftover space after inflexible children are measured, so order of declaration changes the result',
        failureMode: 'Wrapping everything in Expanded until the layout is technically valid and visually wrong',
      },
    ],
    termsIntroduced: ['Widget tree', 'Element tree', 'RenderObject', 'key', 'BoxConstraints', 'unbounded', 'Expanded', 'flex'],
    prerequisites: [4],
    days: ['Three trees', 'Read constraints', 'Tree sketch', 'Adaptive build', 'Unbounded errors', 'Width tests', 'Blind trace'],
  },
  {
    weekNumber: 6,
    phaseId: 'fl-p1',
    theme: 'A design system you can reuse',
    dart: 'InheritedWidget mechanics: how a value travels down a tree without passing it through every constructor',
    flutter: 'ThemeExtension, LayoutBuilder vs MediaQuery, and the Semantics tree',
    design: 'A design system is a contract: twelve components, two themes, one token source, and an accessibility tree that reads correctly',
    project: 'Twelve-component finance UI kit with light and dark themes',
    git: 'Release v0.2 with README and screenshots',
    checkpoint: 'Capstone 2: design system',
    knowledgePoints: [
      {
        primitive: 'InheritedWidget dependency propagation',
        concept:
          'ThemeExtension stores custom tokens in the theme and rebuilds only the widgets that depended on them',
        failureMode: 'Hard-coding colours per widget until dark mode becomes a find-and-replace across forty files',
      },
      {
        primitive: 'Local constraints vs global device metrics',
        concept:
          'LayoutBuilder answers "how much space do I actually have", while MediaQuery answers "what is this device"',
        failureMode: 'Branching on screen width to build a tablet layout inside a phone-sized pane',
      },
      {
        primitive: 'Semantics tree projection',
        concept:
          'Semantics, MergeSemantics and ExcludeSemantics decide what a screen reader announces, which is a design decision, not a cleanup task',
        failureMode: 'Shipping a screen where every icon button is announced as "button" with no label',
      },
    ],
    termsIntroduced: ['ThemeExtension', 'InheritedWidget', 'LayoutBuilder', 'MediaQuery', 'breakpoint', 'Semantics', 'design token'],
    prerequisites: [5],
    days: ['ThemeExtension', 'Breakpoints', 'Component list', 'Build the kit', 'Text scaling', 'Semantics pass', 'Capstone audit'],
  },
  {
    weekNumber: 7,
    phaseId: 'fl-p2',
    theme: 'State that has one owner',
    dart: 'Immutable state objects and copyWith as the only mutation path',
    flutter: 'Riverpod: ProviderScope, ref.watch vs ref.read, autoDispose and family providers',
    design: 'Where state lives decides what the interface can promise — a duplicated value is a lie waiting to surface',
    project: 'Cart and counter with Riverpod, no duplicated state',
    git: 'PR: move state out of widgets',
    checkpoint: 'State ownership map',
    knowledgePoints: [
      {
        primitive: 'Ephemeral StatefulWidget state vs shared application state',
        concept:
          'State that outlives a screen belongs in a provider graph outside the widget tree, not in a State object',
        failureMode: 'Lifting everything into global state until a checkbox animation triggers a full-app rebuild',
      },
      {
        primitive: 'Provider dependency graph',
        concept:
          'watch subscribes and rebuilds, read samples once, listen reacts without rebuilding, select narrows to a slice',
        failureMode: 'Using ref.read inside build, so the widget never updates and looks broken',
      },
      {
        primitive: 'autoDispose and family parameters',
        concept:
          'Providers can be scoped to a lifetime or parameterised per entity, which is how you avoid one giant shared list',
        failureMode: 'Keeping every cart in memory forever because disposal was never considered',
      },
    ],
    termsIntroduced: ['provider', 'ProviderScope', 'ref.watch', 'ref.read', 'autoDispose', 'family', 'state ownership'],
    prerequisites: [6],
    days: ['State types', 'ProviderScope', 'Ownership map', 'Refactor cart', 'Scoped rebuilds', 'Test the flow', 'Blind refactor'],
  },
  {
    weekNumber: 8,
    phaseId: 'fl-p2',
    theme: 'Waiting, cancelling and searching',
    dart: 'Cancellation tokens, debounce timers and race conditions across overlapping futures',
    flutter: 'AsyncValue states, AsyncNotifier, pagination and optimistic rollback',
    design: 'Waiting is a design surface: loading, empty, stale and error each need a deliberate screen',
    project: 'Search screen with debounce and cancellation',
    git: 'Commit the async spike with its test',
    checkpoint: 'Async search under fake_async',
    knowledgePoints: [
      {
        primitive: 'AsyncValue as a sealed state',
        concept:
          'AsyncData, AsyncLoading and AsyncError are the only three states, and previous data can survive a refresh',
        failureMode: 'Showing a full-screen spinner on every keystroke, wiping results the user was reading',
      },
      {
        primitive: 'Overlapping requests and cancellation',
        concept:
          'A later request must be able to cancel an earlier one, or the slower response wins and shows stale results',
        failureMode: 'Typing fast and watching the screen settle on the results for "fl" after you typed "flutter"',
      },
      {
        primitive: 'Debounce and pagination cursors',
        concept:
          'Debounce collapses a burst of input into one request, and a cursor gives a stable place to resume from',
        failureMode: 'Refetching page one on every scroll event, duplicating rows at the seam',
      },
    ],
    termsIntroduced: ['AsyncValue', 'AsyncNotifier', 'cancellation token', 'debounce', 'race condition', 'cursor pagination', 'optimistic rollback'],
    prerequisites: [7],
    days: ['AsyncValue', 'Cancellation', 'Race sketch', 'Search build', 'Stale results', 'Debounce test', 'Blind search'],
  },
  {
    weekNumber: 9,
    phaseId: 'fl-p2',
    theme: 'Routes, deep links and the back button',
    dart: 'Parsing and validating a URI into typed route objects',
    flutter: 'GoRouter, StatefulShellRoute, redirect guards and deep-link restoration',
    design: 'The back button is a promise you made on the previous screen — navigation is a contract, not a stack',
    project: 'Three-tab app with a shareable profile link',
    git: 'PR: route table + redirect guard',
    checkpoint: 'Deep-link walkthrough',
    knowledgePoints: [
      {
        primitive: 'Declarative route graph over an imperative stack',
        concept:
          'The current URI is the source of truth and deterministically constructs the page stack',
        failureMode: 'Pushing the same screen twice from a notification, then needing three back taps to leave it',
      },
      {
        primitive: 'StatefulShellRoute with indexed stacks',
        concept:
          'Each tab keeps its own navigator and history, so switching tabs preserves scroll position and depth',
        failureMode: 'Losing the user’s place every time they check another tab',
      },
      {
        primitive: 'Route redirect guards',
        concept:
          'A redirect decides access before the screen builds, which keeps unauthenticated users out of half-rendered pages',
        failureMode: 'Showing a logged-out screen for two frames before bouncing to login',
      },
    ],
    termsIntroduced: ['deep link', 'route table', 'redirect guard', 'shell route', 'Navigator', 'URI state'],
    prerequisites: [8],
    days: ['Route graph', 'Shell routes', 'URL map', 'Tabbed shell', 'Bad links', 'Restore state', 'Blind routing'],
  },
  {
    weekNumber: 10,
    phaseId: 'fl-p2',
    theme: 'Talking to a server without breaking',
    dart: 'Typed deserialisation, sealed error unions and defensive parsing',
    flutter: 'Dio interceptors, retry with backoff and jitter, CancelToken, DTO to domain mapping',
    design: 'An error message is interface: it must say what happened, what it means and what the person can do next',
    project: 'API client with retries, timeouts and friendly errors',
    git: 'Commit the client and its error tests',
    checkpoint: 'Failure-mode matrix',
    knowledgePoints: [
      {
        primitive: 'Interceptor pipeline',
        concept:
          'Requests, responses and errors pass through ordered interceptors, which is where auth, logging and retry belong',
        failureMode: 'Handling 401 in twelve screens instead of one interceptor',
      },
      {
        primitive: 'Exponential backoff with jitter',
        concept:
          'Retry only idempotent calls, with growing delays and randomness, so a struggling server is not hammered in sync',
        failureMode: 'A retry loop that turns one outage into a self-inflicted denial of service',
      },
      {
        primitive: 'DTO boundary',
        concept:
          'Wire shapes are parsed into domain entities at the edge, so a renamed server field breaks one file instead of twenty',
        failureMode: 'Passing raw JSON maps into widgets until a null field takes down a screen',
      },
    ],
    termsIntroduced: ['interceptor', 'idempotent', 'backoff', 'jitter', 'DTO', 'domain entity', 'timeout'],
    prerequisites: [9],
    days: ['Dio basics', 'Interceptors', 'Error map', 'Client build', 'Timeout drill', 'Retry tests', 'Blind client'],
  },
  {
    weekNumber: 11,
    phaseId: 'fl-p2',
    theme: 'Login that stays logged in',
    dart: 'Cryptographic token anatomy and time-based expiry maths',
    flutter: 'flutter_secure_storage, queued token refresh, auth state machine',
    design: 'Trust is built by asking for less: the login screen should request the minimum and explain why',
    project: 'JWT login with secure storage and silent refresh',
    git: 'PR: auth flow, no secrets committed',
    checkpoint: 'Expired-token walkthrough',
    knowledgePoints: [
      {
        primitive: 'JWT header, payload and signature',
        concept:
          'A short-lived access token proves identity; a long-lived refresh token obtains new access tokens without re-login',
        failureMode: 'Storing a refresh token in SharedPreferences where any backup can read it',
      },
      {
        primitive: 'Concurrent 401 responses',
        concept:
          'A queue serialises refreshes so ten simultaneous failures trigger one refresh and then replay',
        failureMode: 'Ten parallel refreshes invalidating each other and logging the user out at random',
      },
      {
        primitive: 'Auth state machine',
        concept:
          'Splash, authenticated, refreshing and expired are explicit states with defined transitions',
        failureMode: 'Representing logged-out as "user is null" and discovering the difference between unknown and anonymous in production',
      },
    ],
    termsIntroduced: ['access token', 'refresh token', 'JWT', 'Keychain', 'Keystore', 'token refresh', 'auth state machine'],
    prerequisites: [10],
    days: ['Token lifecycle', 'Secure storage', 'Auth flow', 'Login build', 'Expired token', 'Refresh race', 'Blind auth'],
  },
  {
    weekNumber: 12,
    phaseId: 'fl-p2',
    theme: 'Live data without draining the battery',
    dart: 'Stream controllers, buffering and backpressure',
    flutter: 'WebSocket and SSE clients, frame-isolated UI updates, reconnect strategy',
    design: 'Live numbers must not jitter: stable digit widths and throttled updates are courtesy, not polish',
    project: 'Real-time dashboard over WebSocket and SSE',
    git: 'Tag v0.3 connected app',
    checkpoint: 'Capstone 3: real-time terminal',
    knowledgePoints: [
      {
        primitive: 'HTTP polling vs SSE vs WebSocket',
        concept:
          'Polling asks repeatedly, SSE streams one direction over plain HTTP, WebSocket is full duplex over a persistent connection',
        failureMode: 'Choosing WebSocket for a feed that only ever needs server-to-client updates',
      },
      {
        primitive: 'High-frequency buffering',
        concept:
          'Batch ticks and repaint once per frame, so 50 updates a second become one visual change',
        failureMode: 'setState per tick and watching the frame budget evaporate',
      },
      {
        primitive: 'Snapshot plus delta merge',
        concept:
          'Fetch a REST snapshot, then apply deltas on top, so a reconnect does not require replaying everything',
        failureMode: 'Reconnecting and doubling every row because deltas were applied to already-present data',
      },
    ],
    termsIntroduced: ['WebSocket', 'SSE', 'backpressure', 'delta merge', 'heartbeat', 'reconnect'],
    prerequisites: [11],
    days: ['WebSockets', 'SSE', 'Stream map', 'Live dashboard', 'Reconnect drill', 'Backpressure', 'Capstone demo'],
  },
  {
    weekNumber: 13,
    phaseId: 'fl-p3',
    theme: 'Data that survives closing the app',
    dart: 'Relational modelling and the cost of a table scan',
    flutter: 'Drift, reactive watch() queries, migrations and schema versioning',
    design: 'A schema that cannot express an invalid order is a screen that cannot show one',
    project: 'SQLite inventory with reactive queries',
    git: 'PR: schema + migration',
    checkpoint: 'Query plan + migration',
    knowledgePoints: [
      {
        primitive: 'Normalisation and foreign keys',
        concept:
          'Store each fact once and let the database enforce relationships, so contradictory rows are impossible',
        failureMode: 'Duplicating a product name across order rows and having three spellings of the same item',
      },
      {
        primitive: 'B-tree index vs sequential scan',
        concept:
          'An index turns a full table walk into a logarithmic lookup, at the cost of write time and disk',
        failureMode: 'Indexing every column, then wondering why imports became slow',
      },
      {
        primitive: 'Reactive queries and migrations',
        concept:
          'watch() re-emits when the underlying tables change, and a migration moves existing rows forward without data loss',
        failureMode: 'Dropping and recreating the database on upgrade, silently deleting the user’s inventory',
      },
    ],
    termsIntroduced: ['normalisation', 'foreign key', 'index', 'query plan', 'migration', 'reactive query', 'Drift'],
    prerequisites: [12],
    days: ['Tables + keys', 'Drift setup', 'Schema sketch', 'Inventory build', 'Bad migration', 'Query plans', 'Blind queries'],
  },
  {
    weekNumber: 14,
    phaseId: 'fl-p3',
    theme: 'Code that stays easy to change',
    dart: 'Deep modules, explicit boundaries and errors designed out of existence',
    flutter: 'Feature-first folders, repository interfaces, dependency rule',
    design: 'Simple screens are the visible result of strict boundaries behind them',
    project: 'Feature-first refactor of the inventory app',
    git: 'PR: folders + repository boundary',
    checkpoint: 'Dependency-rule audit',
    knowledgePoints: [
      {
        primitive: 'Deep module',
        concept:
          'A small interface hiding substantial implementation beats a shallow pass-through layer that only forwards calls',
        failureMode: 'A repository that exposes the ORM, so every caller depends on the database anyway',
      },
      {
        primitive: 'Local database as single source of truth',
        concept:
          'Screens read from the local store and a background refresh updates it, so the UI never waits on the network',
        failureMode: 'Two sources of truth racing, producing a list that flickers between cached and fresh values',
      },
      {
        primitive: 'Boundary mappers',
        concept:
          'Convert external shapes into domain types once, at the edge, and make invalid states unrepresentable inside',
        failureMode: 'Null checks for the server’s optional fields leaking into every widget',
      },
    ],
    termsIntroduced: ['deep module', 'repository', 'dependency rule', 'feature-first', 'boundary', 'single source of truth'],
    prerequisites: [13],
    days: ['Dependency rule', 'Repositories', 'Folder map', 'Refactor feature', 'Leaky imports', 'Boundary tests', 'Blind refactor'],
  },
  {
    weekNumber: 15,
    phaseId: 'fl-p3',
    theme: 'Offline first: sync without losing work',
    dart: 'Atomic transactions and idempotency keys',
    flutter: 'Outbox queue, optimistic writes, conflict resolution policies',
    design: 'Optimistic UI is a promise about time — show the result now and be honest if it later fails',
    project: 'Outbox, optimistic UI and conflict rules',
    git: 'PR: outbox transaction test',
    checkpoint: 'Capstone 4: offline inventory',
    knowledgePoints: [
      {
        primitive: 'Transactional outbox',
        concept:
          'Write the entity change and its outbound message in one transaction, so a crash cannot lose the intent to sync',
        failureMode: 'Writing locally then calling the network separately, losing the update when the app is killed',
      },
      {
        primitive: 'Idempotency key',
        concept:
          'A stable per-operation key lets the server recognise a replay and apply it once',
        failureMode: 'Retrying a create after a timeout and ending up with two orders',
      },
      {
        primitive: 'Conflict policy',
        concept:
          'Choose last-write-wins, field merge or explicit user resolution per field, and write the rule down',
        failureMode: 'Assuming conflicts never happen, then silently overwriting a colleague’s edit',
      },
    ],
    termsIntroduced: ['outbox', 'idempotency', 'optimistic UI', 'conflict resolution', 'last-write-wins', 'transaction'],
    prerequisites: [14],
    days: ['Outbox', 'Optimism', 'Conflict rules', 'Offline build', 'Duplicate sends', 'Replay test', 'Capstone demo'],
  },
  {
    weekNumber: 16,
    phaseId: 'fl-p3',
    theme: 'A database with rules',
    dart: 'Server-side functions and typed RPC boundaries',
    flutter: 'Supabase client, session handling and typed responses',
    design: 'A permission error is a design problem: say what is restricted, why, and who can grant access',
    project: 'Postgres schema with row-level security',
    git: 'Commit SQL migrations, never credentials',
    checkpoint: 'RLS policy test',
    knowledgePoints: [
      {
        primitive: 'Multi-tenant schema',
        concept:
          'Organisations, memberships and tenant-owned rows make ownership a queryable fact rather than a convention',
        failureMode: 'Filtering by tenant in the client and trusting that every future query remembers to',
      },
      {
        primitive: 'Row-level security policies',
        concept:
          'USING filters reads and WITH CHECK validates writes inside the database, so a compromised client still cannot cross tenants',
        failureMode: 'Treating a hidden button as an access control',
      },
      {
        primitive: 'SECURITY DEFINER functions and audit triggers',
        concept:
          'Elevated operations run server-side with explicit grants, and every mutation leaves a trace',
        failureMode: 'Shipping an admin action callable by any authenticated user',
      },
    ],
    termsIntroduced: ['row-level security', 'tenant', 'USING', 'WITH CHECK', 'SECURITY DEFINER', 'audit trigger', 'RLS'],
    prerequisites: [15],
    days: ['Postgres', 'RLS', 'Tenant sketch', 'Policy build', 'Cross-tenant read', 'Policy tests', 'Blind policies'],
  },
  {
    weekNumber: 17,
    phaseId: 'fl-p3',
    theme: 'Two-way sync that heals itself',
    dart: 'Cursors, tombstones and deterministic merge functions',
    flutter: 'Delta pull, realtime subscriptions, dirty-row protection',
    design: 'A sync engine should be invisible: the screen shows truth, not the machinery that fetched it',
    project: 'Delta pull, realtime updates and tombstones',
    git: 'Tag v0.4 sync engine',
    checkpoint: 'Conflict replay',
    knowledgePoints: [
      {
        primitive: 'High-water-mark cursor',
        concept:
          'Pull everything changed after the last seen updated_at and id, so a reconnect transfers only the delta',
        failureMode: 'Full refresh on every launch, growing slower as the dataset grows',
      },
      {
        primitive: 'Soft-delete tombstones',
        concept:
          'A deleted row must remain visible to sync long enough for every client to learn it is gone',
        failureMode: 'Hard-deleting locally and resurrecting the row on the next pull',
      },
      {
        primitive: 'Dirty-row protection',
        concept:
          'A pull must not overwrite a local row with unsent changes',
        failureMode: 'A background refresh silently reverting what the user just typed',
      },
    ],
    termsIntroduced: ['cursor', 'tombstone', 'high-water mark', 'CDC', 'dirty row', 'delta pull'],
    prerequisites: [16],
    days: ['Cursors', 'CDC', 'Sync map', 'Delta pull', 'Deleted rows', 'Replay drill', 'Blind sync'],
  },
  {
    weekNumber: 18,
    phaseId: 'fl-p3',
    theme: 'Heavy work off the UI thread',
    dart: 'Isolates, shared-nothing memory, message ports, illegal closure captures',
    flutter: 'compute, Isolate.run, background database execution',
    design: 'Progress you can trust: background work needs an honest estimate, a cancel, and a visible end state',
    project: 'Background import with isolates and progress',
    git: 'PR: isolate benchmark',
    checkpoint: 'Frame-time budget',
    knowledgePoints: [
      {
        primitive: 'Isolates with separate heaps',
        concept:
          'Each isolate has its own memory and communicates by copying messages, so no shared mutable state exists',
        failureMode: 'Passing a closure that captures non-sendable state and hitting an unhelpful runtime error',
      },
      {
        primitive: 'Message ports and long-lived workers',
        concept:
          'A persistent worker amortises startup cost across many jobs, unlike Isolate.run per task',
        failureMode: 'Spawning an isolate per row and making the import slower than doing it inline',
      },
      {
        primitive: 'Background database executor',
        concept:
          'Drift can run queries on a background isolate so the UI thread never blocks on disk',
        failureMode: 'Deserialising five thousand rows on the UI thread and dropping a second of frames',
      },
    ],
    termsIntroduced: ['isolate', 'message port', 'shared-nothing', 'compute', 'frame budget', 'jank'],
    prerequisites: [17],
    days: ['Isolates', 'Messages', 'Work split', 'Import build', 'Jank drill', 'Benchmark', 'Blind isolate'],
  },
  {
    weekNumber: 19,
    phaseId: 'fl-p4',
    theme: 'Long lists that stay smooth',
    dart: 'Generics and covariance in viewport child lists',
    flutter: 'Slivers, viewport virtualisation, persistent headers, custom RenderBox',
    design: 'Density is a rhythm: a long list needs consistent row height, a readable scan path and a stable anchor while scrolling',
    project: 'Sliver feed with sticky headers and ten thousand rows',
    git: 'PR: sliver rewrite',
    checkpoint: 'Scroll profile',
    knowledgePoints: [
      {
        primitive: 'Sliver protocol (SliverConstraints → SliverGeometry)',
        concept:
          'Slivers describe how much of themselves is visible, which is what allows a viewport to build only what is on screen',
        failureMode: 'Putting a shrink-wrapped list inside a scroll view and materialising every row at once',
      },
      {
        primitive: 'Persistent header delegates',
        concept:
          'A delegate controls min and max extent and builds a header that pins while its section is in view',
        failureMode: 'A sticky header that jumps because its extent changes between frames',
      },
      {
        primitive: 'Custom RenderBox',
        concept:
          'When layout cannot be expressed with widgets, a RenderBox defines its own constraints, size and child placement',
        failureMode: 'Reaching for a custom render object before checking whether a sliver already does the job',
      },
    ],
    termsIntroduced: ['sliver', 'viewport', 'SliverGeometry', 'persistent header', 'RenderBox', 'virtualisation'],
    prerequisites: [18],
    days: ['Slivers', 'Viewports', 'Feed plan', 'Sliver build', 'Scroll jank', 'Frame profile', 'Blind slivers'],
  },
  {
    weekNumber: 20,
    phaseId: 'fl-p4',
    theme: 'Charts and drawing by hand',
    dart: 'Geometry: vectors, transforms and hit-test maths',
    flutter: 'CustomPainter, paths, canvas save/restore, repaint boundaries, semantics for canvas',
    design: 'A chart is an argument: axis, scale, zero line and label placement decide what the reader concludes',
    project: 'Interactive chart with hit testing',
    git: 'Commit the painter + golden tests',
    checkpoint: 'Chart interaction',
    knowledgePoints: [
      {
        primitive: 'Canvas and DisplayList',
        concept:
          'A painter records drawing commands into a picture that the engine rasterises, so what you draw is what ships',
        failureMode: 'Rebuilding a painter on every frame because shouldRepaint always returns true',
      },
      {
        primitive: 'Affine transforms and path construction',
        concept:
          'Translate, rotate and scale compose in order, and save/restore keeps that composition predictable',
        failureMode: 'Scaling a chart without scaling stroke widths, producing hairlines on one axis',
      },
      {
        primitive: 'RepaintBoundary and canvas semantics',
        concept:
          'An isolated layer stops a small animation repainting the whole tree, and a semantics builder keeps a drawn chart readable',
        failureMode: 'A beautiful chart that a screen reader announces as an unlabelled image',
      },
    ],
    termsIntroduced: ['CustomPainter', 'Path', 'canvas', 'RepaintBoundary', 'hit testing', 'semantics builder', 'affine transform'],
    prerequisites: [19],
    days: ['Canvas', 'Paths', 'Chart sketch', 'Painter build', 'Hit-test bugs', 'Golden tests', 'Blind chart'],
  },
  {
    weekNumber: 21,
    phaseId: 'fl-p4',
    theme: 'Motion that explains, not decorates',
    dart: 'Interpolation maths and physics simulation state',
    flutter: 'Implicit vs explicit animations, SpringSimulation, Hero, Rive',
    design: 'Motion communicates origin, cause and continuity — if an animation explains nothing, it is decoration',
    project: 'Spring transitions, Hero and a Rive state machine',
    git: 'PR: motion tokens',
    checkpoint: '60fps motion audit',
    knowledgePoints: [
      {
        primitive: 'VSYNC ticker loop',
        concept:
          'AnimationControllers advance on display refresh callbacks, so duration is expressed in frames as well as time',
        failureMode: 'Animating layout properties and dropping frames on a mid-range phone',
      },
      {
        primitive: 'Spring simulation',
        concept:
          'A spring describes mass, stiffness and damping, so interruption feels physical rather than restarted',
        failureMode: 'Fixed-duration curves that snap when a gesture interrupts them',
      },
      {
        primitive: 'Shared element transitions',
        concept:
          'A Hero carries an element’s identity between routes, which is what makes navigation feel spatial',
        failureMode: 'Two Heroes with the same tag on one screen, throwing at the worst moment',
      },
    ],
    termsIntroduced: ['ticker', 'AnimationController', 'spring simulation', 'Hero', 'implicit animation', 'motion token'],
    prerequisites: [20],
    days: ['Implicit motion', 'Springs', 'Motion script', 'Hero build', 'Dropped frames', 'Timing audit', 'Blind motion'],
  },
  {
    weekNumber: 22,
    phaseId: 'fl-p4',
    theme: 'Tests that catch real mistakes',
    dart: 'Pure functions, fakes and deterministic time',
    flutter: 'Widget tests, pump vs pumpAndSettle, golden files, accessibility audits',
    design: 'A golden test is a design regression test: it notices when a token change quietly breaks a screen',
    project: 'Unit, widget and golden test pyramid',
    git: 'CI runs tests on every push',
    checkpoint: 'Coverage + accessibility gates',
    knowledgePoints: [
      {
        primitive: 'Deterministic test doubles',
        concept:
          'A fake replaces a boundary so the test controls time, network and disk instead of hoping they behave',
        failureMode: 'Tests that pass locally and fail in CI because they waited on a real timer',
      },
      {
        primitive: 'pump vs pumpAndSettle',
        concept:
          'pump advances one frame, pumpAndSettle waits for animations to finish, and using the wrong one hides real state',
        failureMode: 'pumpAndSettle on an infinite animation, timing out after ten minutes',
      },
      {
        primitive: 'Golden files and semantics checks',
        concept:
          'A golden pins rendered pixels, and a semantics test pins what assistive technology receives',
        failureMode: 'A token change that silently shifts every screen by four pixels and nobody notices for months',
      },
    ],
    termsIntroduced: ['widget test', 'golden test', 'pumpAndSettle', 'fake', 'deterministic time', 'coverage gate'],
    prerequisites: [21],
    days: ['Unit tests', 'Widget tests', 'Test plan', 'Write the pyramid', 'Brittle tests', 'CI gates', 'Blind test plan'],
  },
  {
    weekNumber: 23,
    phaseId: 'fl-p4',
    theme: 'Fast, small and shippable',
    dart: 'Memory ownership, retained references and allocation pressure',
    flutter: 'Impeller profiling, DevTools heap snapshots, obfuscation, flavours, CI/CD',
    design: 'Performance is felt: jank and a cold start are design failures even when the layout is correct',
    project: 'Profile a release build and cut frame and memory waste',
    git: 'Tag release candidate v1.0',
    checkpoint: 'Release build report',
    knowledgePoints: [
      {
        primitive: 'UI thread vs raster thread',
        concept:
          'Building and laying out happens on the UI thread, rasterising on the raster thread, and either can miss the frame budget',
        failureMode: 'Optimising build() when the actual bottleneck is an expensive shader',
      },
      {
        primitive: 'Heap snapshots and retained paths',
        concept:
          'A snapshot diff shows which objects survived when they should not, and the retaining path shows who holds them',
        failureMode: 'A listener that is never removed, keeping an entire screen alive forever',
      },
      {
        primitive: 'Release configuration',
        concept:
          'Obfuscation, flavours and environment injection turn a debug build into something safe to distribute',
        failureMode: 'Shipping a debug build with a hard-coded staging URL',
      },
    ],
    termsIntroduced: ['UI thread', 'raster thread', 'heap snapshot', 'retained path', 'obfuscation', 'flavour', 'Impeller'],
    prerequisites: [22],
    days: ['Frame budget', 'Impeller', 'Perf plan', 'Profile build', 'Memory leak', 'Release build', 'Blind profile'],
  },
  {
    weekNumber: 24,
    phaseId: 'fl-p4',
    theme: 'Ship it and explain it',
    dart: 'Nothing new: the language is a tool you now use without thinking',
    flutter: 'Release pipeline, signing, store readiness and a runbook',
    design: 'A handover is a design artefact: the runbook, the README and the architecture defence are what make the work survive you',
    project: 'Store-ready build, runbook and architecture defence',
    git: 'Merge to main + signed release tag',
    checkpoint: 'Capstone 6: flagship',
    knowledgePoints: [
      {
        primitive: 'Scope of work and acceptance criteria',
        concept:
          'A written scope with explicit out-of-scope items is what prevents a project from expanding until it fails',
        failureMode: 'Saying yes to one more feature in week eleven and shipping nothing',
      },
      {
        primitive: 'Idempotent fulfilment and audit trail',
        concept:
          'Payments and webhooks must be safe to replay, and every state change must be attributable',
        failureMode: 'Charging a customer twice because a webhook retried',
      },
      {
        primitive: 'Handover package',
        concept:
          'Runbook, environment example, architecture notes and a recorded walkthrough let someone else operate the system',
        failureMode: 'A working app that nobody but its author can deploy',
      },
    ],
    termsIntroduced: ['RFC', 'statement of work', 'runbook', 'handover', 'release signing', 'audit trail'],
    prerequisites: [23],
    days: ['Scope the RFC', 'Runbook', 'Release checklist', 'Cut the build', 'Failure drill', 'Handover', 'Architecture defence'],
  },
]

/**
 * Blueprints are keyed by subject. A track with no blueprint cannot generate
 * weeks; the UI says so plainly rather than showing another track's course.
 */
export const BLUEPRINTS: Readonly<Record<string, readonly WeekBlueprint[]>> = {
  flutter: FLUTTER_BLUEPRINT,
}

export function blueprintFor(subjectId: string, weekNumber: number): WeekBlueprint | undefined {
  return BLUEPRINTS[subjectId]?.find((entry) => entry.weekNumber === weekNumber)
}

export function blueprintLength(subjectId: string): number {
  return BLUEPRINTS[subjectId]?.length ?? 0
}
