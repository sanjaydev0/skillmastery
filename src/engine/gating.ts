import type { Overrides, Week, WeekStatus } from '../types/schema'

/**
 * Week gating. The course is linear and starts from zero, so this is the whole
 * prerequisite model: Week N opens when Week N−1's gate passed, or when an
 * audited override exists. There is no concept-level lock and there never will
 * be — concepts are a lens over the route, not a second ledger.
 */

export function activeChecklistCount(week: Week): number {
  return week.checklist.filter((item) => item.done).length
}

export function weekProgress(week: Week): number {
  if (week.checklist.length === 0) return week.gate.passedAt ? 1 : 0
  return week.checklist.filter((item) => item.done).length / week.checklist.length
}

export function isWeekAvailable(week: Week, weeks: Week[], overrides: Overrides): boolean {
  if (overrides.weeks[week.id]) return true
  if (week.prerequisiteWeekIds.length === 0) return true
  return week.prerequisiteWeekIds.every((id) => {
    const prereq = weeks.find((w) => w.id === id)
    return Boolean(prereq?.gate.passedAt)
  })
}

export function weekStatus(week: Week, weeks: Week[], overrides: Overrides): WeekStatus {
  if (week.gate.passedAt) return 'mastered'
  if (!isWeekAvailable(week, weeks, overrides)) return 'locked'
  // Either era counts as started: an answered gate question today, a numeric
  // score from a v5 backup, or one checked task.
  const started =
    week.checklist.some((i) => i.done) ||
    Boolean(week.gate.checks) ||
    Boolean(week.gate.scores) ||
    week.gate.attempts.length > 0
  return started ? 'in-progress' : 'ready'
}

export function missingWeekPrereqs(week: Week, weeks: Week[]): Week[] {
  return week.prerequisiteWeekIds
    .map((id) => weeks.find((w) => w.id === id))
    .filter((w): w is Week => Boolean(w) && !w?.gate.passedAt)
}

export function nextWeek(weeks: Week[], overrides: Overrides): Week | undefined {
  const ordered = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber)
  return ordered.find((w) => weekStatus(w, weeks, overrides) !== 'mastered')
}

export function activeWeek(weeks: Week[], overrides: Overrides): Week | undefined {
  const ordered = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber)
  return (
    ordered.find((w) => weekStatus(w, weeks, overrides) === 'in-progress') ??
    ordered.find((w) => weekStatus(w, weeks, overrides) === 'ready') ??
    ordered[ordered.length - 1]
  )
}
