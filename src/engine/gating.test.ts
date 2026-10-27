import { describe, expect, it } from 'vitest'
import { createSeedData } from '../data/seedData'
import {
  activeWeek,
  isNodeAvailable,
  isNodeOpen,
  isWeekAvailable,
  missingNodePrereqs,
  missingWeekPrereqs,
  nextWeek,
  nodeBadge,
  overallMastery,
  weekProgress,
  weekStatus,
} from './gating'

const seed = createSeedData()
const subject = seed.subjects[0]!
const ordered = [...subject.weeks].sort((a, b) => a.weekNumber - b.weekNumber)
const week1 = ordered[0]!
const week2 = ordered[1]!
const node1 = subject.nodes.find((node) => node.weekId === week1.id)!
const node2 = subject.nodes.find((node) => node.weekId === week2.id)!

describe('week gating', () => {
  it('starts with week 1 ready and later weeks locked behind the prior gate', () => {
    expect(isWeekAvailable(week1, subject.weeks, seed.overrides)).toBe(true)
    expect(isWeekAvailable(week2, subject.weeks, seed.overrides)).toBe(false)
    expect(weekStatus(week1, subject.weeks, seed.overrides)).toBe('ready')
    expect(weekStatus(week2, subject.weeks, seed.overrides)).toBe('locked')
    expect(missingWeekPrereqs(week2, subject.weeks).map((week) => week.id)).toEqual([week1.id])
    expect(nextWeek(subject.weeks, seed.overrides)?.id).toBe(week1.id)
  })

  it('unlocks a week after the prerequisite gate passes or an audited override exists', () => {
    const passedWeeks = subject.weeks.map((week) =>
      week.id === week1.id ? { ...week, gate: { ...week.gate, passedAt: 1_000 } } : week,
    )
    expect(isWeekAvailable(week2, passedWeeks, seed.overrides)).toBe(true)

    const overrides = { ...seed.overrides, weeks: { [week2.id]: 2_000 } }
    expect(isWeekAvailable(week2, subject.weeks, overrides)).toBe(true)
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
})

describe('node gating', () => {
  it('requires both an open week and mastered direct prerequisites', () => {
    expect(isNodeAvailable(node1, subject.nodes, seed.overrides)).toBe(true)
    expect(isNodeOpen(node1, subject, seed.overrides)).toBe(true)

    const prerequisites = node1.prerequisiteIds.map((id) =>
      subject.nodes.find((node) => node.id === id)!,
    )
    expect(prerequisites).toHaveLength(0)
  })

  it('locks a node whose week is locked and reports locked badges', () => {
    expect(isNodeAvailable(node2, subject.nodes, seed.overrides)).toBe(true)
    expect(isNodeOpen(node2, subject, seed.overrides)).toBe(false)
    expect(nodeBadge(node2, subject, seed.overrides)).toBe('locked')
    expect(nodeBadge({ ...node2, status: 'mastered' }, subject, seed.overrides)).toBe('mastered')
  })

  it('flags missing direct node prerequisites', () => {
    const target = {
      ...node1,
      prerequisiteIds: [node2.id],
    }
    expect(missingNodePrereqs(target, subject.nodes).map((node) => node.id)).toEqual([node2.id])
    expect(isNodeAvailable(target, subject.nodes, seed.overrides)).toBe(false)
  })

  it('computes graph mastery from mastered nodes only', () => {
    expect(overallMastery(subject.nodes)).toBe(0)
    const mastered = [...subject.nodes.slice(1), { ...node1, status: 'mastered' as const }]
    expect(overallMastery(mastered)).toBeCloseTo(1 / subject.nodes.length, 5)
  })
})
