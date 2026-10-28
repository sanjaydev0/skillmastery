import type { DayLog, Journey, Pause, Weekday } from '../types/schema'

/**
 * The course clock.
 *
 * Day 1 is the local calendar day the learner pressed Start. Days advance by
 * calendar date, never by elapsed milliseconds, so a daylight-saving change
 * cannot skip or repeat a day. A pause stops the clock: days inside a pause
 * are subtracted from the elapsed total, which freezes the course day exactly
 * where it was.
 *
 * Nothing here is stored. The clock is a pure function of `journey`.
 */

export function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function addLocalDays(dayStart: number, days: number): number {
  const date = new Date(dayStart)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days).getTime()
}

/** Whole calendar days between two instants, ignoring the time of day. */
export function calendarDaysBetween(from: number, to: number): number {
  const a = startOfLocalDay(from)
  const b = startOfLocalDay(to)
  return Math.round((b - a) / 86_400_000)
}

export function isPauseOpen(pause: Pause): boolean {
  return pause.to === null
}

/** True while the course clock is stopped. */
export function isPaused(journey: Journey, now = Date.now()): boolean {
  return journey.pauses.some((pause) => pause.to === null && pause.from <= now)
}

/**
 * Count the calendar days between `from` and `to` that fall inside a pause.
 * Days are collected as a set so overlapping or repeated pauses cannot be
 * counted twice.
 */
export function pausedDaysWithin(pauses: Pause[], from: number, to: number): number {
  if (pauses.length === 0) return 0
  const start = startOfLocalDay(from)
  const end = startOfLocalDay(to)
  if (end < start) return 0

  const paused = new Set<number>()
  for (const pause of pauses) {
    // The day you press pause is a day you were still studying; the freeze
    // starts the following calendar day. Without this, pausing would make the
    // course day jump backwards by one.
    const pauseStart = Math.max(start, addLocalDays(startOfLocalDay(pause.from), 1))
    const pauseEnd = Math.min(end, startOfLocalDay(pause.to ?? to))
    if (pauseEnd < pauseStart) continue
    let cursor = pauseStart
    // Bounded by the course length, so a simple walk is cheap and exact.
    while (cursor <= pauseEnd) {
      paused.add(cursor)
      cursor = addLocalDays(cursor, 1)
    }
  }
  return paused.size
}

/**
 * 1-based course day. Null until the learner presses Start. While paused, the
 * value is frozen rather than advancing behind their back.
 */
export function courseDay(journey: Journey, now = Date.now()): number | null {
  if (journey.startedAt === null) return null
  const elapsed = calendarDaysBetween(journey.startedAt, now) + 1
  const paused = pausedDaysWithin(journey.pauses, journey.startedAt, now)
  return Math.max(1, elapsed - paused)
}

/** 1-based week number. Course days 1–7 are Week 1. */
export function courseWeek(day: number): number {
  return Math.floor((day - 1) / 7) + 1
}

/** 1-based slot inside the current week (the DayPlan day). */
export function daySlot(day: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return ((((day - 1) % 7) + 7) % 7 + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7
}

/** Which weekday a course slot lands on, given the weekday of Day 1. */
export function weekdayOfSlot(startWeekday: Weekday, slot: number): Weekday {
  return (((startWeekday + slot - 1) % 7) + 7) % 7 as Weekday
}

export function isoDate(timestamp: number): string {
  const date = new Date(timestamp)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Every unpaused calendar day from Day 1 through today, oldest first. */
export function elapsedStudyDates(journey: Journey, now = Date.now()): string[] {
  if (journey.startedAt === null) return []
  const dates: string[] = []
  let cursor = startOfLocalDay(journey.startedAt)
  const end = startOfLocalDay(now)
  while (cursor <= end) {
    if (pausedDaysWithin(journey.pauses, cursor, cursor) === 0) {
      dates.push(isoDate(cursor))
    }
    cursor = addLocalDays(cursor, 1)
  }
  return dates
}

export interface Consistency {
  kept: number
  elapsed: number
  /** 0–1. Undefined days are treated as missed, which is why a pause exists. */
  ratio: number
}

/**
 * Consistency counts days with at least one logged habit. It is a ratio, not
 * a streak: a missed day lowers it and nothing resets to zero.
 */
export function consistency(
  journey: Journey,
  dailyLog: Record<string, DayLog>,
  now = Date.now(),
): Consistency {
  const dates = elapsedStudyDates(journey, now)
  const kept = dates.filter((date) => (dailyLog[date]?.items.length ?? 0) > 0).length
  const elapsed = dates.length
  return { kept, elapsed, ratio: elapsed === 0 ? 0 : kept / elapsed }
}

/** Days since the last logged activity, ignoring paused days. */
export function daysSinceActivity(
  journey: Journey,
  dailyLog: Record<string, DayLog>,
  now = Date.now(),
): number {
  const dates = elapsedStudyDates(journey, now)
  for (let index = dates.length - 1; index >= 0; index -= 1) {
    const date = dates[index]!
    if ((dailyLog[date]?.items.length ?? 0) > 0) {
      return dates.length - 1 - index
    }
  }
  return dates.length
}
