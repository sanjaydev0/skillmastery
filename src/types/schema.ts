/**
 * Single source of truth for every persisted entity.
 * All timestamps are epoch milliseconds. Reviews due "today" are resolved
 * against the user's local timezone at read time, never stored as dates.
 */

export const SCHEMA_VERSION = 5
export const SEED_VERSION = 5

/** A prompt skill is edited text, not a document. Keep it well under the AI cap. */
export const PROMPT_TEMPLATE_MAX_CHARS = 20_000

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type SubjectAccent = 'sky' | 'emerald' | 'violet' | 'amber'

export type NodeStatus = 'locked' | 'learning' | 'mastered' | 'needs-repair'

export type WeekStatus = 'locked' | 'ready' | 'in-progress' | 'mastered'

export type MasteryCategory = 'concept' | 'implementation' | 'craft' | 'debugging'

export type MasteryScores = Record<MasteryCategory, number>

export type Mode = 'passive' | 'active'

export type Theme = 'light' | 'dark' | 'system'

export type ResourceKind = 'docs' | 'curriculum' | 'article'

export type ResourceStatus = 'toRead' | 'reading' | 'done'

export type CardSource = 'core' | 'mistake'

export type DetailLevel = 'full' | 'compact'

/**
 * A planned effort range, in minutes. Estimates are deliberately vague: the
 * planner budgets with `max`, while progress reports the whole range.
 */
export interface Estimate {
  min: number
  max: number
}

/**
 * Per-device planning capacity. Never part of the curriculum content.
 *
 * Capacity is declared per week, because that is the unit a person can
 * honestly promise. The per-day figure is derived by spreading the weekly
 * total across `studyDays`; see `dailyCapacity()`.
 */
export interface PlannerSettings {
  weeklyActiveMinutes: number
  weeklyPassiveMinutes: number
  /** Days the learner intends to study. 0 = Sunday. */
  studyDays: Weekday[]
  /** Optional catch-up day, excluded from capacity when set. */
  bufferDay: Weekday | null
  /** Suggested focus block length, used when splitting a task. */
  sessionMinutes: number
}

export const DEFAULT_PLANNER: PlannerSettings = {
  // Measured from the authored weeks: the busiest day carries 100 active
  // minutes, so 12 h/week across seven days is the honest floor. Lowering the
  // slider is allowed; the plan will say which days no longer fit.
  weeklyActiveMinutes: 720,
  weeklyPassiveMinutes: 420,
  studyDays: [0, 1, 2, 3, 4, 5, 6],
  bufferDay: null,
  sessionMinutes: 25,
}

/** 1–7: the day slot inside a course week, independent of weekday names. */
export type DaySlot = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type DayPlanOrigin = 'authored' | 'ai' | 'user'

export interface DayResource {
  label: string
  url?: string
  kind: ResourceKind
}

/**
 * The editorial layer: what a day is asking of the learner and why.
 * The checklist stays the evidence layer — only checked items earn credit.
 */
export interface DayPlan {
  day: DaySlot
  title: string
  /** 250–500 words of explanation written for a beginner. */
  summary: string
  resources: DayResource[]
  tasks: string[]
  /** "Do this, not that" — the one instruction that prevents a common detour. */
  direction: string
  /** The design lesson this day carries, tied to the week's artefact. */
  designNote: string
  estMinutes: number
  origin: DayPlanOrigin
  model?: string
  generatedAt?: number
}

/** A stretch of the course where the clock is stopped. `to: null` = active. */
export interface Pause {
  from: number
  to: number | null
}

/** The course clock. Drives the week number, the day number and consistency. */
export interface Journey {
  /** Local midnight of Day 1. Null until the learner presses Start. */
  startedAt: number | null
  /** Weekday of Day 1, captured at Start so day slots can be labelled. */
  startWeekday: Weekday
  pauses: Pause[]
  /** The gamified layer can be switched off without losing progress. */
  gameLayer: boolean
  onboardedAt: number | null
}

export const DEFAULT_JOURNEY: Journey = {
  startedAt: null,
  startWeekday: 1,
  pauses: [],
  gameLayer: true,
  onboardedAt: null,
}

export type TrashKind = 'week' | 'subject' | 'dayPlans' | 'node' | 'resource'

export interface TrashCounts {
  weeks?: number
  nodes?: number
  cards?: number
  days?: number
  resources?: number
}

/** A graph edge that was pruned from a surviving node when its week was deleted. */
export interface TrashEdge {
  nodeId: string
  prerequisiteIds: string[]
  encompassedNodeIds: string[]
}

export interface TrashEntry {
  id: string
  kind: TrashKind
  deletedAt: number
  label: string
  subjectId: string
  subjectName: string
  /** A complete copy, so restore never depends on anything still living. */
  payload: Week | Subject | DayPlan[] | KnowledgeNode | Resource
  /** Nodes deleted with the week. Restoring the week restores them. */
  nodes?: KnowledgeNode[]
  /** Cards deleted with the week. Restoring the week restores them. */
  cards?: Flashcard[]
  /** Inbound edges pruned on delete, so an undelete reconnects the graph. */
  edges?: TrashEdge[]
  /** Surviving weeks that listed the deleted week as a prerequisite. */
  weekLinks?: string[]
  counts: TrashCounts
}

/** Oldest entries are dropped once this many are kept. */
export const TRASH_LIMIT = 20

export interface KnowledgePoint {
  id: string
  primitive: string
  concept: string
  failureMode: string
  fails: number
  lastFailedAt?: number
}

export interface SrsState {
  /** 0–5. Fractional values come from FIRe implicit reviews. */
  strength: number
  /** Days until the next review. 0 means "never reviewed". */
  intervalDays: number
  /** Epoch ms. 0 means "never scheduled". */
  dueAt: number
  lastReviewedAt?: number
  lastFireAt?: number
  implicitReviews: number
}

export interface RepairFlag {
  id: string
  /** The downstream node whose knowledge point failed twice. */
  fromNodeId: string
  kpId: string
  at: number
  clearedAt?: number
}

export interface KnowledgeNode {
  id: string
  weekId: string
  title: string
  slug: string
  tags: string[]
  prerequisiteIds: string[]
  /** Advanced nodes implicitly exercise these simpler nodes (Math Academy FIRe). */
  encompassedNodeIds: string[]
  knowledgePoints: KnowledgePoint[]
  status: NodeStatus
  srs: SrsState
  repairFlags: RepairFlag[]
  notes?: string
  createdAt?: number
  updatedAt?: number
}

export interface ChecklistItem {
  id: string
  label: string
  context: 'passive' | 'active'
  tier?: 'A' | 'B' | 'C'
  /**
   * Day slot inside the course week, 1–7. This is deliberately not a weekday:
   * the course keeps its own seven-day cycle even when Day 1 is a Wednesday.
   * The real weekday is derived with `weekdayOfSlot(journey.startWeekday, slot)`.
   */
  day?: DaySlot
  /** Legacy planned minutes from schema v1. Superseded by `estimate`. */
  minutes?: number
  /** v2 planned effort range. Falls back to `minutes` when absent. */
  estimate?: Estimate
  done: boolean
  /** When the task was last checked. Cleared on uncheck; drives consistency. */
  doneAt?: number
}

export interface GateAttempt {
  at: number
  scores: MasteryScores
  average: number
  passed: boolean
}

export interface MasteryGate {
  scores?: MasteryScores
  attempts: GateAttempt[]
  passedAt?: number
  notes?: string
}

export interface Week {
  id: string
  weekNumber: number
  phaseId: string
  title: string
  /** One sentence, first-principles anchor. */
  anchor: string
  outcomes: string[]
  /** "Do NOT rabbit hole" items — defer these until their real week. */
  rabbitHoles: string[]
  /** The 30-min canon assignment for this week. */
  bookFocus: string
  prerequisiteWeekIds: string[]
  /** Nodes from earlier weeks that this week's gate implicitly re-exercises. */
  encompassedNodeIds: string[]
  checklist: ChecklistItem[]
  gate: MasteryGate
  capstone?: string
  detail: DetailLevel
}

export interface Phase {
  id: string
  name: string
  subtitle: string
}

export interface Flashcard {
  id: string
  weekId?: string
  nodeId?: string
  front: string
  back: string
  tags: string[]
  source: CardSource
  /** Index into SRS_INTERVALS. */
  scheduleStep: number
  dueAt: number
  lapses: number
  reviews: number
  createdAt: number
  updatedAt: number
}

export interface Resource {
  id: string
  title: string
  url: string
  kind: ResourceKind
  description?: string
  tags: string[]
  status: ResourceStatus
  weekId?: string
}

export interface Book {
  id: string
  title: string
  author: string
  pillar: string
  url: string
  /** 0 when the book has no useful chapter granularity. */
  totalChapters: number
  currentChapter: number
  status: ResourceStatus
  weekFrom: number
  weekTo: number
  notes?: string
}

export interface Subject {
  id: string
  name: string
  shortName: string
  tagline: string
  accent: SubjectAccent
  phases: Phase[]
  weeks: Week[]
  nodes: KnowledgeNode[]
  cards: Flashcard[]
  resources: Resource[]
}

export interface DayLog {
  items: string[]
}

export interface AppPrefs {
  theme: Theme
  mode: Mode
  sidebarCollapsed: boolean
  lastExportAt?: number
  lastBackupReminderAt?: number
  /** localStorage mirror threshold in MB (1-5, default 4). IndexedDB is always primary. */
  localStorageThresholdMB?: number
  /**
   * Total app-data guard in MB (5-200, default 20). IndexedDB is the store, so the
   * guard can exceed the browser's ~5 MB localStorage ceiling. Passing it is a warning,
   * never a write block.
   */
  storageGuardMB?: number
}

export interface Overrides {
  weeks: Record<string, number>
  nodes: Record<string, number>
}

export interface AppData {
  schemaVersion: number
  seedVersion: number
  createdAt: number
  updatedAt: number
  activeSubjectId: string
  subjects: Subject[]
  /** The 30-min passive canon is shared across tracks. */
  books: Book[]
  dailyLog: Record<string, DayLog>
  overrides: Overrides
  prefs: AppPrefs
  planner: PlannerSettings
  /** User-edited prompt skills, keyed by the authored prompt id. */
  promptOverrides: Record<string, string>
  /** The course clock, start date and pause history. */
  journey: Journey
  /** Editorial day cards, keyed by week id. Absent weeks are generation-ready. */
  dayPlans: Record<string, DayPlan[]>
  /** Recently deleted content, restorable, newest first. */
  trash: TrashEntry[]
}

export interface RhythmItem {
  id: string
  label: string
  detail: string
  mode: Mode | 'both'
  minutes: number
  /** Core items count toward the streak. */
  core: boolean
}

export interface PromptTemplate {
  id: string
  title: string
  description: string
  category: 'socratic' | 'review' | 'design' | 'wiki' | 'meta'
  template: string
  tags: string[]
}
