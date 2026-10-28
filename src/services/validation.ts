import { z } from 'zod'
import type { AppData, PlannerSettings, Weekday } from '../types/schema'
import { DEFAULT_PLANNER, SCHEMA_VERSION } from '../types/schema'
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
  day: z.number().int().min(0).max(6).optional(),
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
})

const overridesSchema = z.object({
  weeks: z.record(z.string(), z.number()).default({}),
  nodes: z.record(z.string(), z.number()).default({}),
})

const plannerSchema = z.object({
  weekdayActiveMinutes: z.number().int().min(0).max(720).default(90),
  weekdayPassiveMinutes: z.number().int().min(0).max(720).default(45),
  weekendActiveMinutes: z.number().int().min(0).max(720).default(120),
  weekendPassiveMinutes: z.number().int().min(0).max(720).default(60),
  studyDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5, 6]),
  bufferDay: z.number().int().min(0).max(6).default(0),
  sessionMinutes: z.number().int().min(5).max(180).default(25),
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
  prefs: prefsSchema.default({ theme: 'dark', mode: 'active', sidebarCollapsed: false }),
  planner: plannerSchema.default(() => ({ ...DEFAULT_PLANNER, studyDays: [...DEFAULT_PLANNER.studyDays] })),
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

/** Schema v1 predates `planner`; migrating accepts payloads that omit it. */
export type MigratableAppData = Omit<AppData, 'planner'> & { planner?: PlannerSettings }

/**
 * Future schema upgrades land here. Each step must be additive and defensive:
 * a failed migration returns the original payload rather than throwing.
 */
export function migrateAppData(input: MigratableAppData): AppData {
  const planner: PlannerSettings = input.planner
    ? { ...input.planner, studyDays: [...input.planner.studyDays] }
    : { ...DEFAULT_PLANNER, studyDays: [...DEFAULT_PLANNER.studyDays] }

  if (input.schemaVersion >= SCHEMA_VERSION) return { ...input, planner }

  return {
    ...input,
    schemaVersion: SCHEMA_VERSION,
    planner,
    subjects: input.subjects.map((subject) => ({
      ...subject,
      weeks: subject.weeks.map((week) => ({
        ...week,
        checklist: week.checklist.map((item, index) => {
          // v1 had no day assignments; spread them one per day so the new Plan
          // view has a real schedule instead of a single undated pile.
          const day = (item.day ?? ((index + 1) % 7)) as Weekday
          const estimate = item.estimate ?? estimateForMinutes(item.minutes)
          return { ...item, day, ...(estimate.max > 0 ? { estimate } : {}) }
        }),
      })),
    })),
  }
}
