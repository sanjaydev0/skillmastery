import type {
  ChecklistItem,
  DaySlot,
  Estimate,
  PlannerSettings,
  Subject,
  Week,
  Weekday,
} from '../types/schema'
import { weekdayOfSlot } from '../lib/courseClock'

export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

export const DAY_SLOTS: DaySlot[] = [1, 2, 3, 4, 5, 6, 7]

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

/**
 * The weekly total is the promise; the daily figure is arithmetic. Splitting
 * it across study days keeps one number honest instead of four that drift.
 */
export function dailyCapacity(planner: PlannerSettings): DayCapacity {
  const days = Math.max(1, planner.studyDays.length)
  return {
    active: Math.round(planner.weeklyActiveMinutes / days),
    passive: Math.round(planner.weeklyPassiveMinutes / days),
  }
}

export function capacityFor(day: Weekday, planner: PlannerSettings): DayCapacity {
  // A day the learner is not studying has no new-work capacity. The buffer day
  // is reserved for catch-up, so it carries none either.
  if (!planner.studyDays.includes(day)) return { active: 0, passive: 0 }
  if (planner.bufferDay === day) return { active: 0, passive: 0 }
  return dailyCapacity(planner)
}

export interface DaySummary {
  /** 1–7 inside the course week, independent of weekday names. */
  slot: DaySlot
  /** The real calendar weekday this slot lands on. */
  weekday: Weekday
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
  overloadedDays: DaySlot[]
}

function minutesByMode(items: ChecklistItem[], context: 'active' | 'passive'): number {
  return items
    .filter((item) => item.context === context)
    .reduce((total, item) => total + estimateOf(item).max, 0)
}

/**
 * `startWeekday` is the weekday of course Day 1. It only moves capacity: the
 * content stays on slots 1–7, so a course that starts on a Wednesday still
 * opens with the Week 1 Day 1 card.
 */
export function summariseWeek(
  week: Week,
  planner: PlannerSettings,
  startWeekday: Weekday = 1,
): WeekSummary {
  const days: DaySummary[] = DAY_SLOTS.map((slot) => {
    const weekday = weekdayOfSlot(startWeekday, slot)
    const items = week.checklist.filter((item) => item.day === slot)
    const capacity = capacityFor(weekday, planner)
    const activeMinutes = minutesByMode(items, 'active')
    const passiveMinutes = minutesByMode(items, 'passive')
    return {
      slot,
      weekday,
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
    overloadedDays: days
      .filter((entry) => entry.overBy.active > 0 || entry.overBy.passive > 0)
      .map((entry) => entry.slot),
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
