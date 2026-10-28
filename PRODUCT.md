# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary learner is 13 years old. He works on an 8 GB Linux laptop with Zed, the
Flutter CLI and a physical Android phone. He studies at home, seven days a week,
and may miss 2–6 days in a month. When that happens he pauses the course instead
of pretending the missed days did not happen.

The app also carries a second, more technical Full-Stack Web track. That track
uses the same product model but is not the active teaching track. *(Inferred from
the bundled seed data; confirmed in the build brief only as "two tracks".)*

## Product Purpose

SkillMastery is a local-first control centre for a 168-day apprenticeship in
Dart, Flutter and interface design. It answers four questions and then gets out of
the way:

1. What do I do today?
2. How long is it likely to take?
3. What is the next real piece of work?
4. Is the week actually finished?

Success is not time spent in the app. Success is that the learner returns on the
next course day and can rebuild the week's artefact without notes.

## Positioning

The product is the course, not a dashboard around a course. One start date drives
a real 168-day clock; every day carries an authored or generated card that names
one idea, one mechanism and one failure; the checklist is the only evidence that
earns credit. All of that runs on the device. There is no account, no cloud sync,
no analytics and no curriculum fetched at runtime.

Week 1 is authored. Every later week is generated one week at a time from the
24-week blueprint and the learner's own history, then reviewed before it becomes
canonical. A neighbouring course player could copy the screens; it could not
truthfully copy a course that is already written into the same local data model
as the learner's evidence.

## Operating Context

- Live only at <https://skillmastery-jay.vercel.app/>. A Vercel static build with
  one stateless AI proxy function.
- Installed to the Android home screen as a PWA. The app shell works offline.
- Progress lives in IndexedDB with a localStorage mirror. A JSON backup can be
  exported and re-imported; the AI key is never part of it.
- The learner uses Zed, `flutter`, `dart`, Git and GitHub. There is no Android
  Studio and no emulator in the course.
- Review work may leave the app for AnkiDroid through a TSV export. JSON is only
  for re-importing generated cards.
- The optional AI helper uses a Velona key stored only in this browser under
  `skillmastery:ai-key`. The key is sent per request to the same-origin proxy and
  is never logged or stored on the server.
- The long-form course source is `docs/source/flutter-24-week-plan.txt`; the
  executable route is `src/data/curriculum/blueprint.ts`.

## Capabilities and Constraints

- 24 weeks, 7 days a week, 168 course days. Course day 1 is the local calendar
  day the learner presses Start.
- The course can be paused and resumed. A pause starts counting the next calendar
  day, so pressing Pause never moves the course day backwards.
- Weekly capacity is two totals, active and passive minutes, split across the
  chosen study days. The default is 720 active / 420 passive across seven days.
- Estimates are ranges. Checking a task credits its whole range. The app never
  measures elapsed time and never runs a per-task timer.
- Day cards are stored editorially, keyed by week id. The checklist remains the
  evidence layer. A day card never claims progress.
- Deleting a week or a track is recoverable from a 20-item trash. A restore
  reconnects the prerequisite graph and the day cards.
- AI generation is one request per week, on demand, with an explicit preview and
  cancel. Generated content must pass `checkDayPlans()` and the written standard
  in `docs/CONTENT-STYLE.md` before it is canonical.
- Schema v5. Migrations are additive and preserve checks, notes, estimates,
  planner settings, journey, day cards and trash.
- No accounts, telemetry, cloud sync, background daemons or runtime curriculum
  fetch. The only server-side surface is `/api/chat`.

## Brand Commitments

- The name is SkillMastery.
- Board and paper: a deep green-black chalkboard in dark mode, warm paper and ink
  in light mode, one highlighter accent.
- The voice is calm, plain and specific. It speaks to one learner, uses "you",
  and prefers a full stop to an exclamation mark.
- No hype, no fake urgency, no streak guilt, no "journey" language, no gamified
  badges that punish a missed day.
- The learner is 13. Technical depth is allowed and expected, but it is explained
  in plain words before the jargon appears.

## Evidence on Hand

- `docs/source/flutter-24-week-plan.txt` — the 4,247-line human course source.
- `src/data/curriculum/blueprint.ts` — the 24-week executable route with Dart,
  Flutter and design threads.
- `src/data/tracks/flutterWeeks1to6.ts` — the authored Week 1 tasks; Weeks 2–6
  carry their task lists.
- `docs/CONTENT-STYLE.md` and `src/content/style.ts` — the day-card standard and
  its checker.
- `DESIGN.md` — the incumbent visual and copy contract.
- There are no customers, testimonials, benchmarks, press quotes or commercial
  claims. Do not invent them.

## Product Principles

1. **The next real task beats a dashboard.** One action is obvious; everything
   else is secondary.
2. **The clock is honest and pausable.** A missed day is a pause, not a failure.
   The course day never jumps backwards or silently forwards.
3. **Plain language carries real depth.** A card is deep when it names the
   mechanism, the failure and the observable result, not when its sentences are
   long.
4. **Local-first is a promise, not a setting.** No account, no upload, no hidden
   sync. A key that is not needed stays unused.
5. **Deleting is recoverable.** Destructive actions go to a trash, and a restore
   puts the graph back together.

## Accessibility & Inclusion

- 11px minimum text, WCAG AA contrast for body text, visible focus states.
- 44px touch targets below 768px.
- Reduced motion is respected; no parallax, glow or decorative animation.
- The interface must work at 390px and 1280px, light and dark.
- Instructions are written for a distracted reader: one idea per card, a
  five-minute start, a check the learner can see.
