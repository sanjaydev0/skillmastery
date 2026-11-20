import type { Week } from '../../types/schema'
import { checks } from '../seedHelpers'
import type { WeekContent } from './types'

/**
 * The editorial layer never changes the evidence layer unless a week module
 * explicitly supplies a richer checklist. Checks, notes and gates stay put.
 */
export function applyWeekContent(week: Week, content?: WeekContent): Week {
  if (!content?.checklist) return week
  return { ...week, checklist: checks(week.id, content.checklist) }
}
