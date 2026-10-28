/**
 * Single source of truth for every persisted entity.
 * All timestamps are epoch milliseconds. Reviews due "today" are resolved
 * against the user's local timezone at read time, never stored as dates.
 */

export const SCHEMA_VERSION = 2
export const SEED_VERSION = 1

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

/** Per-device planning capacity. Never part of the curriculum content. */
export interface PlannerSettings {
  weekdayActiveMinutes: number
  weekdayPassiveMinutes: number
  weekendActiveMinutes: number
  weekendPassiveMinutes: number
  /** Days the learner intends to study. 0 = Sunday. */
  studyDays: Weekday[]
  /** Catch-up / review day. 0 = Sunday. */
  bufferDay: Weekday
  /** Suggested focus block length, used when splitting a task. */
  sessionMinutes: number
}

export const DEFAULT_PLANNER: PlannerSettings = {
  weekdayActiveMinutes: 90,
  weekdayPassiveMinutes: 45,
  weekendActiveMinutes: 120,
  weekendPassiveMinutes: 60,
  studyDays: [1, 2, 3, 4, 5, 6],
  bufferDay: 0,
  sessionMinutes: 25,
}

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
  day?: Weekday
  /** Legacy planned minutes from schema v1. Superseded by `estimate`. */
  minutes?: number
  /** v2 planned effort range. Falls back to `minutes` when absent. */
  estimate?: Estimate
  done: boolean
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
