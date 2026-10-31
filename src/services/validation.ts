import { z } from 'zod'
import type {
  AppData,
  ChecklistItem,
  DaySlot,
  Journey,
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

const scoresSchema = z.object({
  concept: z.number().min(0).max(5),
  implementation: z.number().min(0).max(5),
  craft: z.number().min(0).max(5),
  debugging: z.number().min(0).max(5),
})

const gateAttemptSchema = z.object({
  at: z.number(),
  scores: scoresSchema,
  average: z.number(),
  passed: z.boolean(),
})

const gateSchema = z.object({
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
  encompassedNodeIds: z.array(z.string()).default([]),
  checklist: z.array(checklistItemSchema).default([]),
  gate: gateSchema.default({ attempts: [] }),
  capstone: z.string().optional(),
  detail: z.enum(['full', 'compact']).default('compact'),
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
  accent: z.enum(['sky', 'emerald', 'violet', 'amber']),
  phases: z.array(phaseSchema).min(1),
  weeks: z.array(weekSchema),
  nodes: z.array(nodeSchema),
  cards: z.array(cardSchema),
  resources: z.array(resourceSchema),
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
  storageGuardMB: z.number().min(5).max(200).default(20),
})

const overridesSchema = z.object({
  weeks: z.record(z.string(), z.number()).default({}),
  nodes: z.record(z.string(), z.number()).default({}),
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

const trashEdgeSchema = z.object({
  nodeId: z.string().min(1),
  prerequisiteIds: z.array(z.string()).default([]),
  encompassedNodeIds: z.array(z.string()).default([]),
})

const trashEntrySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['week', 'subject', 'dayPlans']),
  deletedAt: z.number(),
  label: z.string(),
  subjectId: z.string(),
  subjectName: z.string(),
  payload: z.union([weekSchema, subjectSchema, z.array(dayPlanSchema)]),
  nodes: z.array(nodeSchema).optional(),
  cards: z.array(cardSchema).optional(),
  edges: z.array(trashEdgeSchema).optional(),
  weekLinks: z.array(z.string()).optional(),
  counts: z
    .object({
      weeks: z.number().optional(),
      nodes: z.number().optional(),
      cards: z.number().optional(),
      days: z.number().optional(),
    })
    .default({}),
})

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
  overrides: overridesSchema.default({ weeks: {}, nodes: {} }),
  prefs: prefsSchema.default({ theme: 'dark', mode: 'active', sidebarCollapsed: false, localStorageThresholdMB: 4, storageGuardMB: 20 }),
  planner: plannerSchema.default(() => ({ ...DEFAULT_PLANNER, studyDays: [...DEFAULT_PLANNER.studyDays] })),
  promptOverrides: z.record(z.string(), z.string().max(PROMPT_TEMPLATE_MAX_CHARS)).default({}),
  journey: journeySchema.default(() => ({ ...DEFAULT_JOURNEY, pauses: [] })),
  dayPlans: z.record(z.string(), z.array(dayPlanSchema)).default({}),
  trash: z.array(trashEntrySchema).default([]),
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
  'planner' | 'promptOverrides' | 'journey' | 'dayPlans' | 'trash'
> & {
  planner?: Partial<PlannerSettings> & {
    /** v3 per-day capacity, folded into the weekly total on upgrade. */
    weekdayActiveMinutes?: number
    weekdayPassiveMinutes?: number
    weekendActiveMinutes?: number
    weekendPassiveMinutes?: number
  }
  promptOverrides?: Record<string, string>
  journey?: Partial<Journey>
  dayPlans?: AppData['dayPlans']
  trash?: TrashEntry[]
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
  const trash = (input.trash ?? []).slice(0, TRASH_LIMIT)
  const subjects = normaliseSubjects(input.subjects, input.schemaVersion < SCHEMA_VERSION)

  if (input.schemaVersion >= SCHEMA_VERSION) {
    return { ...input, subjects, planner, promptOverrides, journey, dayPlans, trash }
  }

  return {
    ...input,
    schemaVersion: SCHEMA_VERSION,
    planner,
    promptOverrides,
    journey,
    dayPlans,
    trash,
    subjects,
  }
}
