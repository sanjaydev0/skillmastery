import type { DayPlan, DaySlot, ResourceKind } from '../../types/schema'

/** One checklist task in an authored week module. */
export interface WeekCheckSpec {
  id: string
  label: string
  context: 'passive' | 'active'
  tier?: 'A' | 'B' | 'C'
  day: DaySlot
  minutes: number
}

/** One extra library resource owned by an authored week. */
export interface WeekResourceSpec {
  id: string
  title: string
  url: string
  kind: ResourceKind
  description?: string
  tags?: string[]
}

/** One extra recall card owned by an authored week. */
export interface WeekCardSpec {
  id: string
  front: string
  back: string
  tags?: string[]
}

/** Authored cards gain their origin when they enter the seed. */
export type AuthoredDayPlan = Omit<DayPlan, 'origin'> & { origin?: 'authored' }

/**
 * One authored week, kept in a single folder under `src/data/weeks/`.
 *
 * Only `dayPlans` is required. A `checklist` override replaces the canonical
 * task list; omit it when the canonical checklist is already authored.
 */
export interface WeekContent {
  weekId: string
  weekNumber: number
  /** Omit to keep the canonical checklist. Provide to replace it. */
  checklist?: WeekCheckSpec[]
  dayPlans: AuthoredDayPlan[]
  resources?: WeekResourceSpec[]
  cards?: WeekCardSpec[]
}
