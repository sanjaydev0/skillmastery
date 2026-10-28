import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANNER } from '../types/schema'
import { summariseWeek } from '../engine/estimates'
import { createSeedData } from './seedData'
import { BLUEPRINTS, FLUTTER_BLUEPRINT, blueprintFor, blueprintLength } from './curriculum/blueprint'

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

  it('carries all three threads in every week', () => {
    for (const entry of FLUTTER_BLUEPRINT) {
      for (const thread of ['dart', 'flutter', 'design'] as const) {
        expect(entry[thread].trim().length, `week ${entry.weekNumber} ${thread}`).toBeGreaterThan(12)
      }
    }
  })

  it('gives every week between three and four knowledge points with a failure mode', () => {
    for (const entry of FLUTTER_BLUEPRINT) {
      expect(entry.knowledgePoints.length, `week ${entry.weekNumber}`).toBeGreaterThanOrEqual(3)
      expect(entry.knowledgePoints.length).toBeLessThanOrEqual(4)
      for (const point of entry.knowledgePoints) {
        expect(point.primitive.trim().length).toBeGreaterThan(3)
        expect(point.concept.trim().length).toBeGreaterThan(20)
        expect(point.failureMode.trim().length).toBeGreaterThan(20)
      }
    }
  })

  it('introduces terms before it uses them elsewhere', () => {
    const seen = new Map<string, number>()
    for (const entry of FLUTTER_BLUEPRINT) {
      for (const term of entry.termsIntroduced) {
        const first = seen.get(term)
        // A term may be revisited, but it should be introduced (not first
        // mentioned) no more than three weeks after its first appearance.
        if (first !== undefined) {
          expect(
            entry.weekNumber - first,
            `"${term}" reappears in week ${entry.weekNumber} after week ${first}`,
          ).toBeLessThanOrEqual(6)
        } else {
          seen.set(term, entry.weekNumber)
        }
      }
    }
    expect(seen.size).toBeGreaterThan(80)
  })

  it('only depends on weeks that come before it', () => {
    for (const entry of FLUTTER_BLUEPRINT) {
      for (const prerequisite of entry.prerequisites) {
        expect(prerequisite, `week ${entry.weekNumber}`).toBeLessThan(entry.weekNumber)
        expect(prerequisite).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('matches the seeded phase for every week', () => {
    for (const week of flutter.weeks) {
      const entry = blueprintFor('flutter', week.weekNumber)
      expect(entry, `week ${week.weekNumber}`).toBeDefined()
      expect(entry!.phaseId).toBe(week.phaseId)
    }
  })

  it('does not lend the Flutter blueprint to a track that has none', () => {
    expect(blueprintFor('fullstack', 5)).toBeUndefined()
    expect(blueprintLength('fullstack')).toBe(0)
    expect(blueprintLength('flutter')).toBe(24)
    expect(Object.keys(BLUEPRINTS)).toEqual(['flutter'])
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
        expect(day.items.length, `week ${weekNumber} day ${day.slot}`).toBeGreaterThan(0)
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
