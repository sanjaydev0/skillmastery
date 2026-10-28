import { describe, expect, it } from 'vitest'
import type { ChecklistItem } from '../types/schema'
import { DEFAULT_PLANNER } from '../types/schema'
import { createSeedData } from '../data/seedData'
import { checks, seedWeek } from '../data/seedHelpers'
import {
  addEstimates,
  capacityFor,
  estimateForMinutes,
  estimateOf,
  formatEstimate,
  formatTotal,
  makeEstimate,
  summariseSubject,
  summariseWeek,
  sumItems,
} from './estimates'

function item(overrides: Partial<ChecklistItem>): ChecklistItem {
  return { id: 'i1', label: 'Task', context: 'active', done: false, ...overrides }
}

describe('estimate maths', () => {
  it('widens a single minute value into a predictable range', () => {
    expect(estimateForMinutes(60)).toEqual({ min: 60, max: 75 })
    expect(estimateForMinutes(45)).toEqual({ min: 45, max: 55 })
    expect(estimateForMinutes(20)).toEqual({ min: 20, max: 25 })
    expect(estimateForMinutes(0)).toEqual({ min: 0, max: 0 })
    expect(estimateForMinutes(undefined)).toEqual({ min: 0, max: 0 })
  })

  it('prefers an explicit estimate over legacy minutes', () => {
    expect(estimateOf(item({ minutes: 30 }))).toEqual({ min: 30, max: 40 })
    expect(estimateOf(item({ minutes: 30, estimate: { min: 20, max: 25 } }))).toEqual({ min: 20, max: 25 })
  })

  it('sums ranges without collapsing them to a single number', () => {
    expect(addEstimates([makeEstimate(10, 15), makeEstimate(20, 30)])).toEqual({ min: 30, max: 45 })
    expect(sumItems([item({ minutes: 60 }), item({ minutes: 30 })])).toEqual({ min: 90, max: 115 })
  })

  it('never lets max fall below min', () => {
    expect(makeEstimate(30, 10)).toEqual({ min: 30, max: 30 })
  })

  it('formats minutes under two hours and hours above', () => {
    expect(formatEstimate({ min: 30, max: 45 })).toBe('30–45 min')
    expect(formatEstimate({ min: 90, max: 105 })).toBe('90–105 min')
    expect(formatEstimate({ min: 120, max: 150 })).toBe('2–2.5 h')
    expect(formatEstimate({ min: 120, max: 120 })).toBe('2 h')
    expect(formatEstimate({ min: 0, max: 0 })).toBe('No estimate')
    expect(formatTotal({ min: 0, max: 0 })).toBe('0 min')
    expect(formatTotal({ min: 30, max: 45 })).toBe('30–45 min')
  })
})

describe('capacity', () => {
  it('uses weekend capacity on Saturday and Sunday', () => {
    expect(capacityFor(1, DEFAULT_PLANNER)).toEqual({ active: 90, passive: 45 })
    expect(capacityFor(6, DEFAULT_PLANNER)).toEqual({ active: 120, passive: 60 })
    expect(capacityFor(0, DEFAULT_PLANNER)).toEqual({ active: 120, passive: 60 })
  })
})

describe('week summary', () => {
  const scheduled = seedWeek({
    id: 'w1',
    weekNumber: 1,
    phaseId: 'p1',
    title: 'Test week',
    anchor: 'anchor',
    bookFocus: 'book',
    gate: 'gate',
    checklist: checks('w1', [
      { label: 'Read', context: 'passive', day: 1, minutes: 30 },
      { label: 'Build', context: 'active', day: 1, minutes: 60 },
      { label: 'Debug', context: 'active', day: 2, minutes: 90 },
    ]),
  })
  // Unassigned tasks still exist for imported or hand-authored weeks, even
  // though fresh seed checks are now spread across the seven days.
  const week = {
    ...scheduled,
    checklist: [
      ...scheduled.checklist,
      { id: 'w1-c4', label: 'Optional read', context: 'passive' as const, minutes: 15, done: false },
    ],
  }

  it('groups tasks by day and leaves undated tasks unassigned', () => {
    const summary = summariseWeek(week, DEFAULT_PLANNER)
    expect(summary.days).toHaveLength(7)
    expect(summary.days[1]!.items.map((entry) => entry.label)).toEqual(['Read', 'Build'])
    expect(summary.unassigned.map((entry) => entry.label)).toEqual(['Optional read'])
  })

  it('flags a day that exceeds its active capacity', () => {
    const summary = summariseWeek(week, DEFAULT_PLANNER)
    expect(summary.days[1]!.overBy).toEqual({ active: 0, passive: 0 })
    expect(summary.days[2]!.overBy.active).toBe(15)
    expect(summary.overloadedDays).toEqual([2])
  })

  it('tracks completed and remaining estimates separately', () => {
    const withDone = {
      ...week,
      checklist: week.checklist.map((entry) =>
        entry.label === 'Build' ? { ...entry, done: true } : entry,
      ),
    }
    const summary = summariseWeek(withDone, DEFAULT_PLANNER)
    expect(summary.done).toEqual({ min: 60, max: 75 })
    expect(summary.planned).toEqual({ min: 195, max: 240 })
    expect(summary.remaining).toEqual({ min: 135, max: 165 })
  })
})

describe('course totals', () => {
  it('sums every week and counts completed items', () => {
    const subject = createSeedData().subjects[0]!
    const totals = summariseSubject(subject)
    expect(totals.weeks).toBe(24)
    expect(totals.items).toBeGreaterThan(100)
    expect(totals.done).toEqual({ min: 0, max: 0 })
    expect(totals.planned.min).toBeGreaterThan(1000)
    expect(totals.planned.max).toBeGreaterThan(totals.planned.min)
  })
})
