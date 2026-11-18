import { describe, expect, it } from 'vitest'
import { createSeedData } from '../data/seedData'
import {
  activeWeek,
  isWeekAvailable,
  missingWeekPrereqs,
  nextWeek,
  weekProgress,
  weekStatus,
} from './gating'
import { overallProof } from './concepts'

const seed = createSeedData()
const subject = seed.subjects[0]!
const ordered = [...subject.weeks].sort((a, b) => a.weekNumber - b.weekNumber)
const week1 = ordered[0]!
const week2 = ordered[1]!

describe('week gating', () => {
  it('starts with week 1 ready and later weeks locked behind the prior gate', () => {
    expect(isWeekAvailable(week1, subject.weeks, seed.overrides)).toBe(true)
    expect(isWeekAvailable(week2, subject.weeks, seed.overrides)).toBe(false)
    expect(weekStatus(week1, subject.weeks, seed.overrides)).toBe('ready')
    expect(weekStatus(week2, subject.weeks, seed.overrides)).toBe('locked')
  })

  it('unlocks a week after the prerequisite gate passes or an audited override exists', () => {
    const passed = { ...week1, gate: { ...week1.gate, passedAt: 500 } }
    expect(isWeekAvailable(week2, [passed, week2], seed.overrides)).toBe(true)
    expect(missingWeekPrereqs(week2, [passed, week2])).toEqual([])

    const locked = [week1, week2]
    expect(missingWeekPrereqs(week2, locked)).toEqual([week1])
    expect(isWeekAvailable(week2, locked, { ...seed.overrides, weeks: { [week2.id]: 1 } })).toBe(true)
  })

  it('reports in-progress and mastered states without mistaking an attempt for a pass', () => {
    const started = {
      ...week1,
      checklist: week1.checklist.map((item, index) => (index === 0 ? { ...item, done: true } : item)),
    }
    expect(weekProgress(started)).toBeGreaterThan(0)
    expect(weekStatus(started, subject.weeks, seed.overrides)).toBe('in-progress')
    expect(weekStatus({ ...week1, gate: { ...week1.gate, passedAt: 500 } }, subject.weeks, seed.overrides)).toBe(
      'mastered',
    )
    expect(activeWeek(subject.weeks, seed.overrides)?.id).toBe(week1.id)
  })

  it('keeps a checked task the only thing that marks a week in progress besides a gate answer', () => {
    const untouched = { ...week1, checklist: week1.checklist.map((item) => ({ ...item, done: false })) }
    expect(weekStatus({ ...untouched, gate: { attempts: [], scores: undefined, checks: undefined } }, subject.weeks, seed.overrides)).toBe('ready')
    expect(weekStatus({ ...untouched, gate: { ...untouched.gate, checks: { explain: true, build: false, finish: false, debug: false } } }, subject.weeks, seed.overrides)).toBe('in-progress')
  })

  it('moves the course forward one week at a time', () => {
    const cleared = ordered.map((week, index) =>
      index === 0 ? { ...week, gate: { ...week.gate, passedAt: 500 } } : week,
    )
    expect(nextWeek(cleared, seed.overrides)?.id).toBe(week2.id)
  })
})

describe('concept rollups', () => {
  it('counts proved concepts from the proof history only', () => {
    expect(overallProof(subject.concepts)).toBe(0)
    expect(subject.concepts.length).toBeGreaterThanOrEqual(100)
  })
})
