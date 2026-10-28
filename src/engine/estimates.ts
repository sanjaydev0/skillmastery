import type {
  ChecklistItem,
  Estimate,
  PlannerSettings,
  Subject,
  Week,
  Weekday,
} from '../types/schema'

export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

export const DAY_LABELS: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
}

export function makeEstimate(min: number, max = min): Estimate {
  const low = Math.max(0, Math.round(min))
  const high = Math.max(low, Math.round(max))
  return { min: low, max: high }
}

/**
 * v1 stored a single `minutes` number. A task that says "60 minutes" in
 * practice takes 60–75, so the migration widens it by a small, predictable
 * margin instead of pretending the old number was exact.
 */
export function estimateForMinutes(minutes: number | undefined): Estimate {
  if (!minutes || minutes <= 0) return { min: 0, max: 0 }
  const spread = minutes >= 60 ? 15 : minutes >= 30 ? 10 : 5
  return makeEstimate(minutes, minutes + spread)
}

export function estimateOf(item: ChecklistItem): Estimate {
  if (item.estimate) return item.estimate
  return estimateForMinutes(item.minutes)
}

export function addEstimates(estimates: Estimate[]): Estimate {
  return estimates.reduce<Estimate>(
    (total, estimate) => ({ min: total.min + estimate.min, max: total.max + estimate.max }),
    { min: 0, max: 0 },
  )
}

export function sumItems(items: ChecklistItem[]): Estimate {
  return addEstimates(items.map(estimateOf))
}

export function formatEstimate(estimate: Estimate): string {
  if (estimate.max <= 0) return 'No estimate'
  if (estimate.max < 120) {
    return estimate.min === estimate.max
      ? `${estimate.max} min`
      : `${estimate.min}–${estimate.max} min`
  }
  const hours = (minutes: number) => {
    const value = minutes / 60
    return Number.isInteger(value) ? `${value}` : value.toFixed(1).replace(/\.0$/, '')
  }
  return estimate.min === estimate.max
    ? `${hours(estimate.max)} h`
    : `${hours(estimate.min)}–${hours(estimate.max)} h`
}

/** Aggregate display: an empty total is 0 min, not a missing estimate. */
export function formatTotal(estimate: Estimate): string {
  if (estimate.max <= 0) return '0 min'
  return formatEstimate(estimate)
}

export interface DayCapacity {
  active: number
  passive: number
}

export function capacityFor(day: Weekday, planner: PlannerSettings): DayCapacity {
  const weekend = day === 0 || day === 6
  return {
    active: weekend ? planner.weekendActiveMinutes : planner.weekdayActiveMinutes,
    passive: weekend ? planner.weekendPassiveMinutes : planner.weekdayPassiveMinutes,
  }
}

export interface DaySummary {
  day: Weekday
  items: ChecklistItem[]
  planned: Estimate
  done: Estimate
  activeMinutes: number
  passiveMinutes: number
  capacity: DayCapacity
  /** Minutes over capacity, using the upper bound of each estimate. 0 = fits. */
  overBy: DayCapacity
}

export interface WeekSummary {
  days: DaySummary[]
  unassigned: ChecklistItem[]
  planned: Estimate
  done: Estimate
  remaining: Estimate
  activeMinutes: number
  passiveMinutes: number
  overloadedDays: Weekday[]
}

function minutesByMode(items: ChecklistItem[], context: 'active' | 'passive'): number {
  return items
    .filter((item) => item.context === context)
    .reduce((total, item) => total + estimateOf(item).max, 0)
}

export function summariseWeek(week: Week, planner: PlannerSettings): WeekSummary {
  const days: DaySummary[] = WEEKDAYS.map((day) => {
    const items = week.checklist.filter((item) => item.day === day)
    const capacity = capacityFor(day, planner)
    const activeMinutes = minutesByMode(items, 'active')
    const passiveMinutes = minutesByMode(items, 'passive')
    return {
      day,
      items,
      planned: sumItems(items),
      done: sumItems(items.filter((item) => item.done)),
      activeMinutes,
      passiveMinutes,
      capacity,
      overBy: {
        active: Math.max(0, activeMinutes - capacity.active),
        passive: Math.max(0, passiveMinutes - capacity.passive),
      },
    }
  })
  const unassigned = week.checklist.filter((item) => item.day === undefined)
  const planned = sumItems(week.checklist)
  const done = sumItems(week.checklist.filter((item) => item.done))
  return {
    days,
    unassigned,
    planned,
    done,
    remaining: makeEstimate(planned.min - done.min, planned.max - done.max),
    activeMinutes: minutesByMode(week.checklist, 'active'),
    passiveMinutes: minutesByMode(week.checklist, 'passive'),
    overloadedDays: days.filter((entry) => entry.overBy.active > 0 || entry.overBy.passive > 0).map((entry) => entry.day),
  }
}

export interface CourseTotals {
  planned: Estimate
  done: Estimate
  remaining: Estimate
  items: number
  doneItems: number
  weeks: number
}

export function summariseSubject(subject: Subject): CourseTotals {
  const items = subject.weeks.flatMap((week) => week.checklist)
  const doneItems = items.filter((item) => item.done)
  const planned = sumItems(items)
  const done = sumItems(doneItems)
  return {
    planned,
    done,
    remaining: makeEstimate(planned.min - done.min, planned.max - done.max),
    items: items.length,
    doneItems: doneItems.length,
    weeks: subject.weeks.length,
  }
}
