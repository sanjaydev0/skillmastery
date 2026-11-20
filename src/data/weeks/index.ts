import type { DayPlan } from '../../types/schema'
import type { WeekContent } from './types'

interface WeekModule {
  default: WeekContent
}

/**
 * One folder per authored week. Adding a week means adding one folder; nothing
 * else in the app needs to know the week exists.
 */
const modules = import.meta.glob<WeekModule>('./week-*/index.ts', { eager: true })

export const WEEK_CONTENT: WeekContent[] = Object.values(modules)
  .map((module) => module.default)
  .sort((a, b) => a.weekNumber - b.weekNumber)

export function contentForWeek(weekNumber: number): WeekContent | undefined {
  return WEEK_CONTENT.find((content) => content.weekNumber === weekNumber)
}

/** All authored cards, keyed by week id, ready for the fresh seed. */
export function authoredDayPlans(): Record<string, DayPlan[]> {
  const result: Record<string, DayPlan[]> = {}
  for (const content of WEEK_CONTENT) {
    result[content.weekId] = content.dayPlans
      .map((plan) => ({ ...plan, origin: 'authored' as const }))
      .sort((a, b) => a.day - b.day)
  }
  return result
}
