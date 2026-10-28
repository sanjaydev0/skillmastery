import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANNER } from '../types/schema'
import { summariseWeek } from '../engine/estimates'
import { createSeedData } from './seedData'
import { FLUTTER_BLUEPRINT, blueprintFor } from './curriculum/blueprint'

const seed = createSeedData()
const flutter = seed.subjects.find((subject) => subject.id === 'flutter')!

describe('24-week blueprint', () => {
  it('covers every week with seven day focuses', () => {
    expect(FLUTTER_BLUEPRINT).toHaveLength(24)
    expect(new Set(FLUTTER_BLUEPRINT.map((entry) => entry.weekNumber))).toEqual(
      new Set(Array.from({ length: 24 }, (_, index) => index + 1)),
    )
    for (const entry of FLUTTER_BLUEPRINT) {
      expect(entry.days).toHaveLength(7)
      expect(entry.days.every((day) => day.trim().length > 0)).toBe(true)
      expect(entry.theme.trim().length).toBeGreaterThan(0)
      expect(entry.project.trim().length).toBeGreaterThan(0)
      expect(entry.git.trim().length).toBeGreaterThan(0)
      expect(entry.checkpoint.trim().length).toBeGreaterThan(0)
    }
  })

  it('matches the seeded phase for every week', () => {
    for (const week of flutter.weeks) {
      const entry = blueprintFor(week.weekNumber)
      expect(entry, `week ${week.weekNumber}`).toBeDefined()
      expect(entry!.phaseId).toBe(week.phaseId)
    }
  })
})

describe('day plans', () => {
  it('fits every seeded week inside the default daily capacity', () => {
    for (const subject of seed.subjects) {
      for (const week of subject.weeks) {
        const summary = summariseWeek(week, DEFAULT_PLANNER)
        expect(
          summary.overloadedDays,
          `${subject.shortName} week ${week.weekNumber} is over capacity`,
        ).toEqual([])
      }
    }
  })

  it('gives weeks 1–2 a complete seven-day plan with an active output each day', () => {
    for (const weekNumber of [1, 2]) {
      const week = flutter.weeks.find((entry) => entry.weekNumber === weekNumber)!
      const summary = summariseWeek(week, DEFAULT_PLANNER)
      expect(week.checklist.length).toBeGreaterThanOrEqual(14)
      for (const day of summary.days) {
        expect(day.items.length, `week ${weekNumber} day ${day.day}`).toBeGreaterThan(0)
        expect(day.items.some((item) => item.context === 'active')).toBe(true)
      }
      expect(week.checklist.some((item) => /git|github|commit|pull request/i.test(item.label))).toBe(true)
    }
  })

  it('keeps a git habit in every later week', () => {
    for (const week of flutter.weeks) {
      expect(
        week.checklist.some((item) => /commit and push|git|github/i.test(item.label)),
        `week ${week.weekNumber}`,
      ).toBe(true)
    }
  })
})
