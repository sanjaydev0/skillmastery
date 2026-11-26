import { z } from 'zod'
import type {
  AppData,
  ChecklistItem,
  Concept,
  DayProof,
  DaySlot,
  GateChecks,
  Journey,
  MasteryScores,
  PlannerSettings,
  Subject,
  TrashEntry,
  Weekday,
} from '../types/schema'
import {
  DEFAULT_JOURNEY,
  DEFAULT_PLANNER,
  PROMPT_TEMPLATE_MAX_CHARS,
  SCHEMA_VERSION,
  TRASH_LIMIT,
} from '../types/schema'
import { estimateForMinutes } from '../engine/estimates'

/**
 * The v5 knowledge node, kept only so an old backup can still be read. Nothing
 * in the app writes this shape any more; `nodeToConcept` turns it into a v6
 * concept on import.
 */
interface LegacyKnowledgeNode {
  id: string
  weekId: string
  title: string
  knowledgePoints: Array<{ primitive: string; concept: string; failureMode: string }>
  status: 'locked' | 'learning' | 'mastered' | 'needs-repair'
  srs: { strength: number; dueAt: number }
  notes?: string
  createdAt?: number
  updatedAt?: number
}

const knowledgePointSchema = z.object({
  id: z.string().min(1),
  primitive: z.string(),
  concept: z.string(),
  failureMode: z.string(),
  fails: z.number().int().min(0).default(0),
  lastFailedAt: z.number().optional(),
})

const srsSchema = z.object({
  strength: z.number().min(0).max(5).default(0),
  intervalDays: z.number().min(0).default(0),
  dueAt: z.number().default(0),
  lastReviewedAt: z.number().optional(),
  lastFireAt: z.number().optional(),
  implicitReviews: z.number().int().min(0).default(0),
})

const repairFlagSchema = z.object({
  id: z.string().min(1),
  fromNodeId: z.string().min(1),
  kpId: z.string().min(1),
  at: z.number(),
  clearedAt: z.number().optional(),
})

const nodeSchema = z.object({
  id: z.string().min(1),
  weekId: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().min(1),
  tags: z.array(z.string()).default([]),
  prerequisiteIds: z.array(z.string()).default([]),
  encompassedNodeIds: z.array(z.string()).default([]),
  knowledgePoints: z.array(knowledgePointSchema).default([]),
  status: z.enum(['locked', 'learning', 'mastered', 'needs-repair']),
  srs: srsSchema.default({ strength: 0, intervalDays: 0, dueAt: 0, implicitReviews: 0 }),
  repairFlags: z.array(repairFlagSchema).default([]),
  notes: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
})

const checklistItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  context: z.enum(['passive', 'active']),
  tier: z.enum(['A', 'B', 'C']).optional(),
  day: z.number().int().min(0).max(7).optional(),
  minutes: z.number().int().min(0).optional(),
  estimate: z
    .object({
      min: z.number().int().min(0),
      max: z.number().int().min(0),
    })
    .refine((value) => value.max >= value.min, 'estimate.max must be >= estimate.min')
    .optional(),
  done: z.boolean().default(false),
})

const gateChecksSchema = z.object({
  explain: z.boolean(),
  build: z.boolean(),
  finish: z.boolean(),
  debug: z.boolean(),
})

const proofCheckSchema = z.object({
  at: z.number(),
  outcome: z.enum(['cold', 'warm', 'failed']),
  note: z.string().optional(),
})

const conceptSchema = z.object({
  id: z.string().min(1),
  weekId: z.string().min(1),
  weekNumber: z.number().int().min(1),
  term: z.string().min(1),
  definition: z.string().default(''),
  failureMode: z.string().default(''),
  checks: z.array(proofCheckSchema).default([]),
  step: z.number().int().min(-1).default(-1),
  dueAt: z.number().default(0),
  notes: z.string().optional(),
  createdAt: z.number().default(0),
  updatedAt: z.number().default(0),
})

const dayProofSchema = z.object({
  weekId: z.string().min(1),
  day: z.number().int().min(1).max(7),
  at: z.number(),
  outcome: z.enum(['cold', 'warm', 'failed']),
  note: z.string().optional(),
})

const scoresSchema = z.object({
  concept: z.number().min(0).max(5),
  implementation: z.number().min(0).max(5),
  craft: z.number().min(0).max(5),
  debugging: z.number().min(0).max(5),
})

const gateAttemptSchema = z.object({
  at: z.number(),
  checks: gateChecksSchema.optional(),
  /** Legacy v5 scores, kept on import so the attempt history stays readable. */
  scores: scoresSchema.optional(),
  average: z.number().optional(),
  passed: z.boolean(),
  note: z.string().optional(),
})

const gateSchema = z.object({
  checks: gateChecksSchema.optional(),
  scores: scoresSchema.optional(),
  attempts: z.array(gateAttemptSchema).default([]),
  passedAt: z.number().optional(),
  notes: z.string().optional(),
})

const weekSchema = z.object({
  id: z.string().min(1),
  weekNumber: z.number().int().min(1),
  phaseId: z.string().min(1),
  title: z.string().min(1),
  anchor: z.string(),
  outcomes: z.array(z.string()).default([]),
  rabbitHoles: z.array(z.string()).default([]),
  bookFocus: z.string().default(''),
  prerequisiteWeekIds: z.array(z.string()).default([]),
  checklist: z.array(checklistItemSchema).default([]),
  gate: gateSchema.default({ attempts: [] }),
  capstone: z.string().optional(),
  detail: z.enum(['full', 'compact']).default('compact'),
  review: z
    .object({
      at: z.number(),
      note: z.string(),
    })
    .optional(),
})

const phaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subtitle: z.string().default(''),
})

const cardSchema = z.object({
  id: z.string().min(1),
  weekId: z.string().optional(),
  nodeId: z.string().optional(),
  front: z.string().min(1),
  back: z.string().min(1),
  tags: z.array(z.string()).default([]),
  source: z.enum(['core', 'mistake']),
  scheduleStep: z.number().int().min(0).max(4).default(0),
  dueAt: z.number().default(0),
  lapses: z.number().int().min(0).default(0),
  reviews: z.number().int().min(0).default(0),
  createdAt: z.number().default(0),
  updatedAt: z.number().default(0),
})

const resourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  kind: z.enum(['docs', 'curriculum', 'article']),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['toRead', 'reading', 'done']).default('toRead'),
  weekId: z.string().optional(),
})

const bookSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  author: z.string(),
  pillar: z.string(),
  url: z.string().url(),
  totalChapters: z.number().int().min(0).default(0),
  currentChapter: z.number().int().min(0).default(0),
  status: z.enum(['toRead', 'reading', 'done']).default('toRead'),
  weekFrom: z.number().int().min(1).max(52),
  weekTo: z.number().int().min(1).max(52),
  notes: z.string().optional(),
})

const subjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shortName: z.string().min(1),
  tagline: z.string(),
  accent: z.enum(['cobalt', 'sky', 'emerald', 'violet', 'amber']),
  phases: z.array(phaseSchema).min(1),
  weeks: z.array(weekSchema),
  concepts: z.array(conceptSchema).default([]),
  dayProofs: z.array(dayProofSchema).default([]),
  cards: z.array(cardSchema),
  resources: z.array(resourceSchema),
  /** v5 import only. The migration turns nodes into concepts and drops them. */
  nodes: z.array(nodeSchema).optional(),
})

const dayLogSchema = z.object({
  items: z.array(z.string()).default([]),
})

const prefsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('dark'),
  mode: z.enum(['passive', 'active']).default('active'),
  sidebarCollapsed: z.boolean().default(false),
  lastExportAt: z.number().optional(),
  lastBackupReminderAt: z.number().optional(),
  localStorageThresholdMB: z.number().min(1).max(5).default(4),
})

const overridesSchema = z.object({
  weeks: z.record(z.string(), z.number()).default({}),
})

/**
 * Capacity is weekly in v4. The four per-day fields are still accepted so a
 * v3 backup keeps its real capacity, then they are folded into the weekly
 * total by `normalisePlanner()` and dropped.
 */
const plannerSchema = z.object({
  weeklyActiveMinutes: z.number().int().min(0).max(10_080).optional(),
  weeklyPassiveMinutes: z.number().int().min(0).max(10_080).optional(),
  studyDays: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  bufferDay: z.number().int().min(0).max(6).nullable().default(null),
  sessionMinutes: z.number().int().min(5).max(180).default(25),
  weekdayActiveMinutes: z.number().int().min(0).max(720).optional(),
  weekdayPassiveMinutes: z.number().int().min(0).max(720).optional(),
  weekendActiveMinutes: z.number().int().min(0).max(720).optional(),
  weekendPassiveMinutes: z.number().int().min(0).max(720).optional(),
})

const dayResourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().optional(),
  kind: z.enum(['docs', 'curriculum', 'article']).default('docs'),
})

const dayPlanSchema = z.object({
  day: z.number().int().min(1).max(7),
  title: z.string().min(1),
  summary: z.string().min(1),
  resources: z.array(dayResourceSchema).default([]),
  tasks: z.array(z.string()).default([]),
  direction: z.string().default(''),
  designNote: z.string().default(''),
  transferNote: z.string().max(180).optional(),
  estMinutes: z.number().int().min(0).max(600).default(60),
  origin: z.enum(['authored', 'ai', 'user']).default('user'),
  model: z.string().optional(),
  generatedAt: z.number().optional(),
})

const pauseSchema = z.object({
  from: z.number(),
  to: z.number().nullable(),
})

const journeySchema = z.object({
  startedAt: z.number().nullable().default(null),
  startWeekday: z.number().int().min(0).max(6).default(1),
  pauses: z.array(pauseSchema).default([]),
  gameLayer: z.boolean().default(true),
  onboardedAt: z.number().nullable().default(null),
})

const trashEntrySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['week', 'subject', 'dayPlans']),
  deletedAt: z.number(),
  label: z.string(),
  subjectId: z.string(),
  subjectName: z.string(),
  payload: z.union([weekSchema, subjectSchema, z.array(dayPlanSchema)]),
  concepts: z.array(conceptSchema).optional(),
  dayProofs: z.array(dayProofSchema).optional(),
  cards: z.array(cardSchema).optional(),
  weekLinks: z.array(z.string()).optional(),
  counts: z
    .object({
      weeks: z.number().optional(),
      concepts: z.number().optional(),
      dayProofs: z.number().optional(),
      cards: z.number().optional(),
      days: z.number().optional(),
    })
    .default({}),
})

/**
 * v5 trash could hold a knowledge node. The graph is gone, so a node entry is
 * accepted on import and dropped by the migration instead of rejecting the
 * whole backup. It was never restorable across the v6 change anyway.
 */
const legacyTrashEntrySchema = z.looseObject({ kind: z.literal('node') })

export const appDataSchema = z.object({
  // Missing versions predate explicit versioning, so they must migrate too.
  schemaVersion: z.number().int().default(1),
  seedVersion: z.number().int().default(0),
  createdAt: z.number().default(0),
  updatedAt: z.number().default(0),
  activeSubjectId: z.string().min(1),
  subjects: z.array(subjectSchema).min(1),
  books: z.array(bookSchema).default([]),
  dailyLog: z.record(z.string(), dayLogSchema).default({}),
  bugLog: z.record(z.string(), z.string().max(280)).default({}),
  overrides: overridesSchema.default({ weeks: {} }),
  prefs: prefsSchema.default({ theme: 'dark', mode: 'active', sidebarCollapsed: false, localStorageThresholdMB: 4 }),
  planner: plannerSchema.default(() => ({ ...DEFAULT_PLANNER, studyDays: [...DEFAULT_PLANNER.studyDays] })),
  promptOverrides: z.record(z.string(), z.string().max(PROMPT_TEMPLATE_MAX_CHARS)).default({}),
  journey: journeySchema.default(() => ({ ...DEFAULT_JOURNEY, pauses: [] })),
  dayPlans: z.record(z.string(), z.array(dayPlanSchema)).default({}),
  trash: z.array(z.union([trashEntrySchema, legacyTrashEntrySchema])).default([]),
})

export interface ParsedBackup {
  data: AppData
  exportedAt?: string
}

export function parseBackupJson(raw: string): ParsedBackup {
  const json: unknown = JSON.parse(raw)
  const envelope = json as { data?: unknown; exportedAt?: string }
  const candidate = envelope && typeof envelope === 'object' && 'data' in envelope ? envelope.data : json
  const parsed = appDataSchema.parse(candidate)
  return { data: migrateAppData(parsed as AppData), exportedAt: envelope?.exportedAt }
}

/**
 * Schema v1 predates `planner`; v2 predates `promptOverrides`; v3 predates
 * `journey`, `dayPlans` and `trash`. Migrating accepts payloads that omit any
 * of them, and never rejects a backup for a field it can derive.
 */
export type MigratableAppData = Omit<
  AppData,
  'planner' | 'promptOverrides' | 'journey' | 'dayPlans' | 'trash' | 'subjects' | 'bugLog'
> & {
  /**
   * Pre-v6 payloads carry no concepts or day proofs and may still carry the v5
   * node graph; the migration turns one into the other.
   */
  subjects: Array<
    Omit<Subject, 'concepts' | 'dayProofs'> &
      Partial<Pick<Subject, 'concepts' | 'dayProofs'>> & { nodes?: LegacyKnowledgeNode[] }
  >
  planner?: Partial<PlannerSettings> & {
    /** v3 per-day capacity, folded into the weekly total on upgrade. */
    weekdayActiveMinutes?: number
    weekdayPassiveMinutes?: number
    weekendActiveMinutes?: number
    weekendPassiveMinutes?: number
  }
  promptOverrides?: Record<string, string>
  bugLog?: Record<string, string>
  journey?: Partial<Journey>
  dayPlans?: AppData['dayPlans']
  /** v5 trash could hold a node entry; the migration drops it. */
  trash?: Array<TrashEntry | { kind: 'node' }>
}

const LEGACY_WEEKDAY_ACTIVE = 90
const LEGACY_WEEKDAY_PASSIVE = 45
const LEGACY_WEEKEND_ACTIVE = 120
const LEGACY_WEEKEND_PASSIVE = 60

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, Math.round(value)))
}

function uniqueWeekdays(days: number[]): Weekday[] {
  return [...new Set(days)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b) as Weekday[]
}

/**
 * Capacity moved from four per-day numbers to two weekly totals in v4. A v3
 * payload is converted from five weekdays plus two weekend days, so nobody
 * loses the capacity they had actually configured.
 */
export function normalisePlanner(raw: MigratableAppData['planner']): PlannerSettings {
  const source = raw ?? {}
  // Only a payload that actually carried per-day numbers gets converted. A
  // payload with no planner at all should receive today's defaults, not a
  // conversion of defaults from two versions ago.
  const hasLegacyCapacity = [
    source.weekdayActiveMinutes,
    source.weekdayPassiveMinutes,
    source.weekendActiveMinutes,
    source.weekendPassiveMinutes,
  ].some((value) => typeof value === 'number')

  const weeklyActiveMinutes = clampInt(
    source.weeklyActiveMinutes ??
      (hasLegacyCapacity
        ? (source.weekdayActiveMinutes ?? LEGACY_WEEKDAY_ACTIVE) * 5 +
          (source.weekendActiveMinutes ?? LEGACY_WEEKEND_ACTIVE) * 2
        : DEFAULT_PLANNER.weeklyActiveMinutes),
    0,
    10_080,
  )
  const weeklyPassiveMinutes = clampInt(
    source.weeklyPassiveMinutes ??
      (hasLegacyCapacity
        ? (source.weekdayPassiveMinutes ?? LEGACY_WEEKDAY_PASSIVE) * 5 +
          (source.weekendPassiveMinutes ?? LEGACY_WEEKEND_PASSIVE) * 2
        : DEFAULT_PLANNER.weeklyPassiveMinutes),
    0,
    10_080,
  )

  let studyDays = uniqueWeekdays(source.studyDays ?? DEFAULT_PLANNER.studyDays)
  let bufferDay =
    source.bufferDay === null || source.bufferDay === undefined ? null : (source.bufferDay as Weekday)

  // Seven study days leave nothing for a buffer: the buffer is dropped rather
  // than silently removing a day the learner asked to study.
  if (studyDays.length >= 7) {
    bufferDay = null
  }
  // A buffer day that is also a study day would double-count capacity.
  if (bufferDay !== null) {
    const pruned = studyDays.filter((day) => day !== bufferDay)
    if (pruned.length > 0) {
      studyDays = pruned
    } else {
      bufferDay = null
    }
  }
  if (studyDays.length === 0) {
    studyDays = [...DEFAULT_PLANNER.studyDays]
    bufferDay = null
  }

  return {
    weeklyActiveMinutes,
    weeklyPassiveMinutes,
    studyDays,
    bufferDay,
    sessionMinutes: clampInt(source.sessionMinutes ?? DEFAULT_PLANNER.sessionMinutes, 5, 180),
  }
}

export function normaliseJourney(raw: MigratableAppData['journey']): Journey {
  const source = raw ?? {}
  const startedAt =
    typeof source.startedAt === 'number' && Number.isFinite(source.startedAt)
      ? source.startedAt
      : null
  // A start date implies its own weekday; trusting a missing field would shift
  // every day label by an arbitrary amount.
  const startWeekday: Weekday =
    startedAt !== null
      ? (new Date(startedAt).getDay() as Weekday)
      : ((source.startWeekday ?? DEFAULT_JOURNEY.startWeekday) as Weekday)

  const pauses = (source.pauses ?? [])
    .filter((pause) => typeof pause?.from === 'number' && Number.isFinite(pause.from))
    .map((pause) => ({
      from: pause.from,
      to: typeof pause.to === 'number' && Number.isFinite(pause.to) ? pause.to : null,
    }))
    .sort((a, b) => a.from - b.from)

  return {
    startedAt,
    startWeekday: startWeekday >= 0 && startWeekday <= 6 ? startWeekday : 1,
    pauses,
    gameLayer: source.gameLayer ?? DEFAULT_JOURNEY.gameLayer,
    onboardedAt:
      typeof source.onboardedAt === 'number' && Number.isFinite(source.onboardedAt)
        ? source.onboardedAt
        : null,
  }
}

function normaliseDayPlans(raw: AppData['dayPlans'] | undefined): AppData['dayPlans'] {
  if (!raw || typeof raw !== 'object') return {}
  const result: AppData['dayPlans'] = {}
  for (const [weekId, plans] of Object.entries(raw)) {
    if (!Array.isArray(plans)) continue
    const byDay = new Map<number, (typeof plans)[number]>()
    for (const plan of plans) {
      if (!plan || typeof plan.day !== 'number') continue
      if (plan.day < 1 || plan.day > 7) continue
      byDay.set(plan.day, plan)
    }
    const ordered = [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([, plan]) => plan)
    if (ordered.length > 0) result[weekId] = ordered
  }
  return result
}

/**
 * Schema v5 moved checklist placement from weekday numbers to day slots.
 * Slot 7 used to be stored as weekday 0 (Sunday); every other value is already
 * the slot number. Keep accepting 0 so a v4 backup still imports.
 */
function normaliseChecklistDay(raw: number | undefined): DaySlot | undefined {
  if (raw === undefined || !Number.isInteger(raw)) return undefined
  if (raw === 0) return 7
  if (raw >= 1 && raw <= 7) return raw as DaySlot
  return undefined
}

function normaliseSubjects(subjects: Subject[], fillMissingDays: boolean): Subject[] {
  return subjects.map((subject) => ({
    ...subject,
    weeks: subject.weeks.map((week) => ({
      ...week,
      checklist: week.checklist.map((item, index): ChecklistItem => {
        const fallback = fillMissingDays ? (index % 7) + 1 : undefined
        const day = normaliseChecklistDay(item.day ?? fallback)
        const estimate = item.estimate ?? estimateForMinutes(item.minutes)
        return {
          ...item,
          ...(day === undefined ? {} : { day }),
          ...(estimate.max > 0 ? { estimate } : {}),
        }
      }),
    })),
  }))
}

/** A v5 node becomes a v6 concept. The old claim stays, labelled as a claim. */
function nodeToConcept(node: LegacyKnowledgeNode, weekNumber: number): Concept {
  const first = node.knowledgePoints[0]
  return {
    id: node.id,
    weekId: node.weekId,
    weekNumber,
    term: node.title,
    definition: first?.concept ?? '',
    failureMode: first?.failureMode ?? '',
    checks:
      node.status === 'mastered'
        ? [{ at: node.updatedAt ?? Date.now(), outcome: 'warm', note: 'Carried over from the old concept map' }]
        : [],
    // The old strength was a 0–5 number nobody could really judge; it only
    // seeds where in the review ladder the concept starts.
    step: node.srs.strength >= 3 ? 2 : node.srs.strength > 0 ? 1 : -1,
    dueAt: node.srs.dueAt,
    notes: node.notes,
    createdAt: node.createdAt ?? 0,
    updatedAt: node.updatedAt ?? 0,
  }
}

/** Four yes/no questions from four guessed 1–5 numbers: 4 and up counts as yes. */
function gateChecksFromScores(scores: MasteryScores): GateChecks {
  return {
    explain: scores.concept >= 4,
    build: scores.implementation >= 4,
    finish: scores.craft >= 4,
    debug: scores.debugging >= 4,
  }
}

function gateChecksPass(checks: GateChecks): boolean {
  return checks.explain && checks.build && checks.finish && checks.debug
}

/**
 * Schema v6: concepts and day proofs arrive, and the numeric gate becomes four
 * yes/no answers. Runs for every payload so a hand-edited v6 file is normalised
 * too, but the v5 conversions only run for a pre-v6 payload.
 */
function migrateSubjectsV6(subjects: Subject[], legacy: boolean): Subject[] {
  return subjects.map((subject) => {
    const loose = subject as Subject & {
      concepts?: Concept[]
      dayProofs?: DayProof[]
      nodes?: LegacyKnowledgeNode[]
    }
    const weekNumberOf = new Map(subject.weeks.map((week) => [week.id, week.weekNumber]))
    const carried = legacy
      ? (loose.nodes ?? [])
          .filter((node) => weekNumberOf.has(node.weekId))
          .map((node) => nodeToConcept(node, weekNumberOf.get(node.weekId)!))
      : []
    const weeks = subject.weeks.map((week) => {
      if (week.gate.checks || !legacy || !week.gate.scores) return week
      const checks = gateChecksFromScores(week.gate.scores)
      // A week only stays cleared when every answer was actually yes.
      return {
        ...week,
        gate: {
          ...week.gate,
          checks,
          passedAt: gateChecksPass(checks) ? week.gate.passedAt : undefined,
        },
      }
    })
    return {
      ...subject,
      weeks,
      concepts: [...(loose.concepts ?? []), ...carried],
      dayProofs: loose.dayProofs ?? [],
    }
  })
}

/**
 * Future schema upgrades land here. Each step must be additive and defensive:
 * a failed migration returns the original payload rather than throwing.
 */
export function migrateAppData(input: MigratableAppData): AppData {
  const planner = normalisePlanner(input.planner)
  // A blank or oversized override is not worth rejecting a whole backup over;
  // drop the blank one so it falls back to the authored template.
  const promptOverrides = Object.fromEntries(
    Object.entries(input.promptOverrides ?? {})
      .filter(([, value]) => value.trim().length > 0)
      .map(([id, value]) => [id, value.slice(0, PROMPT_TEMPLATE_MAX_CHARS)]),
  )
  const journey = normaliseJourney(input.journey)
  const dayPlans = normaliseDayPlans(input.dayPlans)
  // Schema v8: a one-line bug log, keyed by local date. Older payloads simply
  // start empty rather than being rejected.
  const bugLog = input.bugLog ?? {}
  // Concept trash entries died with the graph; a deleted week keeps its own
  // concepts inside its payload.
  const trash = (input.trash ?? [])
    .filter((entry) => entry.kind !== 'node')
    .slice(0, TRASH_LIMIT)
  // The v6 concept/gate conversion must only run for pre-v6 payloads. Bumping
  // the schema version must not re-run an older step against newer data.
  const legacyV6 = input.schemaVersion < 6
  const subjects = migrateSubjectsV6(
    normaliseSubjects(input.subjects as Subject[], legacyV6),
    legacyV6,
  )

  if (input.schemaVersion >= SCHEMA_VERSION) {
    return { ...input, subjects, planner, promptOverrides, journey, dayPlans, trash, bugLog }
  }

  return {
    ...input,
    schemaVersion: SCHEMA_VERSION,
    planner,
    promptOverrides,
    journey,
    dayPlans,
    trash,
    bugLog,
    subjects,
  }
}
