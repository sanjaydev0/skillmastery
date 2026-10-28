import { describe, expect, it } from 'vitest'
import type { Journey } from '../types/schema'
import {
  addLocalDays,
  calendarDaysBetween,
  consistency,
  courseDay,
  courseWeek,
  daySlot,
  daysSinceActivity,
  elapsedStudyDates,
  isoDate,
  pausedDaysWithin,
  startOfLocalDay,
  weekdayOfSlot,
} from './courseClock'

function day(year: number, month: number, date: number): number {
  return startOfLocalDay(new Date(year, month, date, 12).getTime())
}

function journeyFrom(startedAt: number, overrides: Partial<Journey> = {}): Journey {
  return {
    startedAt,
    startWeekday: new Date(startedAt).getDay() as Journey['startWeekday'],
    pauses: [],
    gameLayer: true,
    onboardedAt: null,
    ...overrides,
  }
}

describe('calendar days', () => {
  it('ignores the time of day', () => {
    expect(calendarDaysBetween(day(2026, 0, 1), day(2026, 0, 2))).toBe(1)
    expect(calendarDaysBetween(day(2026, 0, 1), day(2026, 0, 1))).toBe(0)
    expect(calendarDaysBetween(day(2026, 0, 1), day(2026, 1, 1))).toBe(31)
  })

  it('advances one day at a time across a daylight-saving boundary', () => {
    // Whatever the local zone, walking by local calendar date must produce a
    // strict sequence of whole days with no repeats and no gaps.
    let cursor = day(2026, 2, 1)
    const seen: string[] = []
    for (let index = 0; index < 60; index += 1) {
      seen.push(isoDate(cursor))
      cursor = addLocalDays(cursor, 1)
    }
    expect(new Set(seen).size).toBe(60)
    expect(calendarDaysBetween(day(2026, 2, 1), cursor)).toBe(60)
  })
})

describe('course day', () => {
  it('is null before the course starts', () => {
    expect(courseDay(journeyFrom(0, { startedAt: null }), Date.now())).toBeNull()
  })

  it('starts at 1 on the start date', () => {
    const start = day(2026, 9, 28)
    expect(courseDay(journeyFrom(start), start)).toBe(1)
    expect(courseDay(journeyFrom(start), addLocalDays(start, 1))).toBe(2)
    expect(courseDay(journeyFrom(start), addLocalDays(start, 6))).toBe(7)
    expect(courseDay(journeyFrom(start), addLocalDays(start, 7))).toBe(8)
  })

  it('never skips or repeats a day across a month', () => {
    const start = day(2026, 2, 1)
    for (let index = 0; index < 60; index += 1) {
      expect(courseDay(journeyFrom(start), addLocalDays(start, index))).toBe(index + 1)
    }
  })

  it('freezes while paused and resumes where it stopped', () => {
    const start = day(2026, 9, 1)
    const pauseStart = addLocalDays(start, 5)
    const journey = journeyFrom(start, { pauses: [{ from: pauseStart, to: null }] })

    expect(courseDay(journey, pauseStart)).toBe(6)
    expect(courseDay(journey, addLocalDays(start, 6))).toBe(6)
    expect(courseDay(journey, addLocalDays(start, 30))).toBe(6)

    const resumed: Journey = {
      ...journey,
      pauses: [{ from: pauseStart, to: addLocalDays(start, 10) }],
    }
    // Days 6–11 are paused, so Day 12 resumes at course day 7.
    expect(courseDay(resumed, addLocalDays(start, 11))).toBe(7)
    expect(courseDay(resumed, addLocalDays(start, 12))).toBe(8)
  })

  it('does not double count overlapping pauses', () => {
    const start = day(2026, 0, 1)
    const pauses = [
      { from: day(2026, 0, 3), to: day(2026, 0, 6) },
      { from: day(2026, 0, 4), to: day(2026, 0, 5) },
    ]
    // The pause starts the day after it is pressed, so days 4, 5 and 6 are
    // paused once, not twice.
    expect(pausedDaysWithin(pauses, start, day(2026, 0, 7))).toBe(3)
  })
})

describe('course week and slot', () => {
  it('turns course days into weeks and slots', () => {
    expect(courseWeek(1)).toBe(1)
    expect(courseWeek(7)).toBe(1)
    expect(courseWeek(8)).toBe(2)
    expect(courseWeek(168)).toBe(24)
    expect(daySlot(1)).toBe(1)
    expect(daySlot(7)).toBe(7)
    expect(daySlot(8)).toBe(1)
    expect(daySlot(168)).toBe(7)
  })

  it('maps a slot onto the weekday of Day 1', () => {
    // Day 1 on a Thursday (4) makes Day 4 a Sunday (0).
    expect(weekdayOfSlot(4, 1)).toBe(4)
    expect(weekdayOfSlot(4, 4)).toBe(0)
    expect(weekdayOfSlot(4, 7)).toBe(3)
  })
})

describe('consistency', () => {
  const start = day(2026, 9, 1)

  it('counts days with a logged item as a ratio, never a streak', () => {
    const journey = journeyFrom(start)
    const dailyLog = {
      [isoDate(start)]: { items: ['a'] },
      [isoDate(addLocalDays(start, 1))]: { items: [] },
      [isoDate(addLocalDays(start, 2))]: { items: ['b'] },
    }
    const result = consistency(journey, dailyLog, addLocalDays(start, 2))
    expect(result).toEqual({ kept: 2, elapsed: 3, ratio: 2 / 3 })
  })

  it('excludes paused days from both sides of the ratio', () => {
    const journey = journeyFrom(start, {
      pauses: [{ from: addLocalDays(start, 1), to: addLocalDays(start, 3) }],
    })
    const dates = elapsedStudyDates(journey, addLocalDays(start, 4))
    // The pause begins the day after it is pressed, so days 2 and 3 are
    // excluded and days 0, 1 and 4 remain.
    expect(dates).toEqual([
      isoDate(start),
      isoDate(addLocalDays(start, 1)),
      isoDate(addLocalDays(start, 4)),
    ])
  })

  it('reports how many active days have passed since the last log', () => {
    const journey = journeyFrom(start)
    const dailyLog = { [isoDate(addLocalDays(start, 1))]: { items: ['x'] } }
    expect(daysSinceActivity(journey, dailyLog, addLocalDays(start, 4))).toBe(3)
  })
})
