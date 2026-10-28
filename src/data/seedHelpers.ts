import type {
  Book,
  ChecklistItem,
  Flashcard,
  KnowledgeNode,
  KnowledgePoint,
  Resource,
  ResourceKind,
  Week,
  Weekday,
} from '../types/schema'
import { estimateForMinutes } from '../engine/estimates'

export interface CheckSpec {
  label: string
  context: 'passive' | 'active'
  tier?: 'A' | 'B' | 'C'
  day?: Weekday
  minutes?: number
}

export function checks(weekId: string, specs: CheckSpec[]): ChecklistItem[] {
  return specs.map((spec, index) => {
    const minutes = spec.minutes ?? (spec.context === 'passive' ? 30 : 60)
    // Day 1 is Monday and Day 7 is Sunday. Spreading tasks one per day gives
    // every week a usable schedule until authored day plans replace it.
    const day = spec.day ?? (((index + 1) % 7) as Weekday)
    return {
      id: `${weekId}-c${index + 1}`,
      label: spec.label,
      context: spec.context,
      ...(spec.tier ? { tier: spec.tier } : {}),
      day,
      minutes,
      estimate: estimateForMinutes(minutes),
      done: false,
    }
  })
}

export function standardChecks(
  weekId: string,
  opts: { docs: string; book: string; paper: string; build: string; error: string; tests: string; gate: string },
): ChecklistItem[] {
  return checks(weekId, [
    { label: `Read the docs: ${opts.docs}`, context: 'passive', minutes: 60 },
    { label: `Read and note: ${opts.book} → 3 bullets`, context: 'passive', minutes: 30 },
    { label: `Sketch it on paper: ${opts.paper}`, context: 'passive', minutes: 45 },
    { label: `Build: ${opts.build}`, context: 'active', tier: 'A', minutes: 60 },
    { label: `Break it on purpose: ${opts.error}`, context: 'active', tier: 'A', minutes: 15 },
    { label: `Test and write it up: ${opts.tests}`, context: 'active', tier: 'B', minutes: 60 },
    { label: `Weekly checkpoint: ${opts.gate}`, context: 'active', tier: 'C', minutes: 60 },
  ])
}

export interface NodeSpec {
  id: string
  weekId: string
  title: string
  tags: string[]
  kp: [primitive: string, concept: string, failureMode: string]
  prereq?: string[]
  encompasses?: string[]
  extraKps?: Array<[primitive: string, concept: string, failureMode: string]>
  notes?: string
}

export function seedNode(spec: NodeSpec): KnowledgeNode {
  const make = (index: number, tuple: [string, string, string]): KnowledgePoint => ({
    id: `${spec.id}-kp${index + 1}`,
    primitive: tuple[0],
    concept: tuple[1],
    failureMode: tuple[2],
    fails: 0,
  })
  return {
    id: spec.id,
    weekId: spec.weekId,
    title: spec.title,
    slug: spec.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
    tags: spec.tags,
    prerequisiteIds: spec.prereq ?? [],
    encompassedNodeIds: spec.encompasses ?? [],
    knowledgePoints: [make(0, spec.kp), ...(spec.extraKps ?? []).map((tuple, index) => make(index + 1, tuple))],
    status: 'locked',
    srs: { strength: 0, intervalDays: 0, dueAt: 0, implicitReviews: 0 },
    repairFlags: [],
    ...(spec.notes ? { notes: spec.notes } : {}),
  }
}

export interface WeekSpec {
  id: string
  weekNumber: number
  phaseId: string
  title: string
  anchor: string
  bookFocus: string
  gate: string
  checklist: ChecklistItem[]
  outcomes?: string[]
  rabbitHoles?: string[]
  prerequisiteWeekIds?: string[]
  encompassedNodeIds?: string[]
  capstone?: string
  detail?: 'full' | 'compact'
}

export function seedWeek(spec: WeekSpec): Week {
  const prefix = spec.id.replace(/w\d+$/, '')
  const defaultPrereq = spec.weekNumber === 1 ? [] : [`${prefix}w${spec.weekNumber - 1}`]
  return {
    id: spec.id,
    weekNumber: spec.weekNumber,
    phaseId: spec.phaseId,
    title: spec.title,
    anchor: spec.anchor,
    outcomes: spec.outcomes ?? [],
    rabbitHoles: spec.rabbitHoles ?? [],
    bookFocus: spec.bookFocus,
    prerequisiteWeekIds: spec.prerequisiteWeekIds ?? defaultPrereq,
    encompassedNodeIds: spec.encompassedNodeIds ?? [],
    checklist: spec.checklist,
    gate: { attempts: [], notes: spec.gate },
    ...(spec.capstone ? { capstone: spec.capstone } : {}),
    detail: spec.detail ?? 'full',
  }
}

export interface CardSpec {
  id: string
  weekId: string
  nodeId?: string
  front: string
  back: string
  tags?: string[]
  source?: 'core' | 'mistake'
}

export function seedCard(spec: CardSpec): Flashcard {
  return {
    id: spec.id,
    weekId: spec.weekId,
    ...(spec.nodeId ? { nodeId: spec.nodeId } : {}),
    front: spec.front,
    back: spec.back,
    tags: spec.tags ?? [],
    source: spec.source ?? 'core',
    scheduleStep: 0,
    dueAt: 0,
    lapses: 0,
    reviews: 0,
    createdAt: 0,
    updatedAt: 0,
  }
}

export function seedResource(
  id: string,
  title: string,
  url: string,
  kind: ResourceKind,
  weekId?: string,
  description?: string,
  tags: string[] = [],
): Resource {
  return {
    id,
    title,
    url,
    kind,
    ...(description ? { description } : {}),
    tags,
    status: 'toRead',
    ...(weekId ? { weekId } : {}),
  }
}

export function seedBook(input: {
  id: string
  title: string
  author: string
  url: string
  pillar?: string
  totalChapters: number
  weekFrom: number
  weekTo: number
}): Book {
  return {
    id: input.id,
    title: input.title,
    author: input.author,
    pillar: input.pillar ?? 'Timeless craft',
    url: input.url,
    totalChapters: input.totalChapters,
    currentChapter: 0,
    status: 'toRead',
    weekFrom: input.weekFrom,
    weekTo: input.weekTo,
  }
}
