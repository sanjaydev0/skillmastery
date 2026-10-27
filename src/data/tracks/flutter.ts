import type { Subject } from '../../types/schema'
import { flutterFoundation } from './flutterWeeks1to6'
import { flutterArchitecture } from './flutterWeeks7to12'
import { flutterSystems } from './flutterWeeks13to24'

export const flutterSubject: Subject = {
  id: 'flutter',
  name: 'Flutter, Dart & High-Craft UI/UX',
  shortName: 'Flutter',
  tagline:
    'A 24-week mastery track: Dart primitives, design systems, three-tree fluency, reactive architecture, offline sync, and production delivery.',
  accent: 'sky',
  phases: [
    {
      id: 'fl-p1',
      name: 'Phase 1 · Foundations',
      subtitle: 'Dart core, visual systems, three trees, and static/adaptive layout',
    },
    {
      id: 'fl-p2',
      name: 'Phase 2 · Reactive systems',
      subtitle: 'Riverpod, GoRouter, resilient networking, auth, and real-time streams',
    },
    {
      id: 'fl-p3',
      name: 'Phase 3 · Offline-first',
      subtitle: 'Drift, outbox sync, Postgres RLS, delta pulls, and isolates',
    },
    {
      id: 'fl-p4',
      name: 'Phase 4 · Production',
      subtitle: 'Slivers, canvas, motion, testing, profiling, and delivery',
    },
  ],
  weeks: [
    ...flutterFoundation.weeks,
    ...flutterArchitecture.weeks,
    ...flutterSystems.weeks,
  ],
  nodes: [
    ...flutterFoundation.nodes,
    ...flutterArchitecture.nodes,
    ...flutterSystems.nodes,
  ],
  cards: [
    ...flutterFoundation.cards,
    ...flutterArchitecture.cards,
    ...flutterSystems.cards,
  ],
  resources: [
    ...flutterFoundation.resources,
    ...flutterArchitecture.resources,
    ...flutterSystems.resources,
  ],
}
