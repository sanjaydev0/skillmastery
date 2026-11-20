import type { Subject } from '../../types/schema'
import { buildConcepts } from '../../engine/concepts'
import { FLUTTER_BLUEPRINT } from '../curriculum/blueprint'
import { seedCard, seedResource } from '../seedHelpers'
import { WEEK_CONTENT, contentForWeek } from '../weeks'
import { applyWeekContent } from '../weeks/apply'
import { flutterFoundation } from './flutterWeeks1to6'
import { flutterArchitecture } from './flutterWeeks7to12'
import { flutterSystems } from './flutterWeeks13to24'

const baseWeeks = [
  ...flutterFoundation.weeks,
  ...flutterArchitecture.weeks,
  ...flutterSystems.weeks,
]

const baseCards = [
  ...flutterFoundation.cards,
  ...flutterArchitecture.cards,
  ...flutterSystems.cards,
].map((card) => ({ ...card, nodeId: undefined }))

const baseResources = [
  ...flutterFoundation.resources,
  ...flutterArchitecture.resources,
  ...flutterSystems.resources,
]

/** Authored ids are stable; a duplicate id never replaces the canonical item. */
function uniqueById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const seen = new Set(base.map((entry) => entry.id))
  return [...base, ...extra.filter((entry) => !seen.has(entry.id))]
}

const authoredCards = WEEK_CONTENT.flatMap((content) =>
  (content.cards ?? []).map((card) => seedCard({ ...card, weekId: content.weekId })),
)

const authoredResources = WEEK_CONTENT.flatMap((content) =>
  (content.resources ?? []).map((resource) =>
    seedResource(
      resource.id,
      resource.title,
      resource.url,
      resource.kind,
      content.weekId,
      resource.description,
      resource.tags ?? [],
    ),
  ),
)

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
  // Each week module can replace a generic checklist with authored tasks.
  weeks: baseWeeks.map((week) => applyWeekContent(week, contentForWeek(week.weekNumber))),
  // Concepts are derived from the blueprint, never hand-built.
  concepts: buildConcepts(FLUTTER_BLUEPRINT, (weekNumber) => `fl-w${weekNumber}`),
  dayProofs: [],
  // Seeded cards predate the concept index, so their old node ids would point
  // at nothing. The week link already carries their context, and a learner can
  // link a card to a concept in the card form.
  cards: uniqueById(baseCards, authoredCards),
  resources: uniqueById(baseResources, authoredResources),
}
