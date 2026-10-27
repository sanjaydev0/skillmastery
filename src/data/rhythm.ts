import type { RhythmItem } from '../types/schema'

export const RHYTHM_ITEMS: RhythmItem[] = [
  {
    id: 'canon',
    label: '30-minute canon',
    detail: 'Read the assigned chapters and write three first-principles bullets.',
    mode: 'passive',
    minutes: 30,
    core: true,
  },
  {
    id: 'docs',
    label: 'Official docs block',
    detail: 'Read the canonical spec on your phone — not a tutorial, not a video.',
    mode: 'passive',
    minutes: 60,
    core: false,
  },
  {
    id: 'paper',
    label: 'Paper engineering',
    detail: 'Sketch the widget tree, state table, or handwritten code with zero look-back.',
    mode: 'passive',
    minutes: 45,
    core: true,
  },
  {
    id: 'spar',
    label: 'Socratic AI sparring',
    detail: 'Interrogate your mental model by voice or text, then fix the gap on paper.',
    mode: 'passive',
    minutes: 15,
    core: false,
  },
  {
    id: 'build',
    label: 'Tier A deep build',
    detail: '60 blind minutes translating today’s paper into working code.',
    mode: 'active',
    minutes: 60,
    core: true,
  },
  {
    id: 'tests',
    label: 'Tests, polish & wiki',
    detail: 'Night block: tests, UI craft, and compiling the note into the wiki.',
    mode: 'active',
    minutes: 60,
    core: false,
  },
  {
    id: 'recall',
    label: 'Anki + FIRe queue',
    detail: 'Clear the due cards and implicit reviews before they decay.',
    mode: 'both',
    minutes: 10,
    core: false,
  },
  {
    id: 'gate',
    label: 'Blind mastery gate',
    detail: 'Closed book, zero AI, sixty minutes. The calendar does not unlock weeks.',
    mode: 'active',
    minutes: 60,
    core: false,
  },
]

export const CORE_RHYTHM_IDS = RHYTHM_ITEMS.filter((item) => item.core).map((item) => item.id)
