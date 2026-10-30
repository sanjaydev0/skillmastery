import { describe, expect, it } from 'vitest'
import { createSeedData } from '../data/seedData'
import type { Subject } from '../types/schema'
import { earnedMilestones, milestonesFor } from './milestones'

function flutter(): Subject {
  return createSeedData().subjects.find((entry) => entry.id === 'flutter') as Subject
}

function mark(subject: Subject, id: string) {
  return milestonesFor(subject).find((entry) => entry.id === id)!
}

describe('progress marks', () => {
  it('earns nothing on a fresh subject', () => {
    const subject = flutter()
    expect(milestonesFor(subject).every((entry) => !entry.earned)).toBe(true)
    expect(earnedMilestones(subject)).toEqual([])
  })

  it('earns a mark from checked tasks and reports the check that met it', () => {
    const subject = flutter()
    const items = subject.weeks[0]!.checklist
    items[0] = { ...items[0]!, done: true, doneAt: 1_000 }
    items[1] = { ...items[1]!, done: true, doneAt: 2_000 }
    subject.weeks[0]!.checklist = items

    expect(mark(subject, 'first-check').earned).toBe(true)
    expect(mark(subject, 'first-check').earnedAt).toBe(1_000)
    expect(mark(subject, 'ten-checks').earned).toBe(false)
    expect(mark(subject, 'ten-checks').progress).toEqual({ done: 2, total: 10 })
  })

  it('does not count a task without a check', () => {
    const subject = flutter()
    subject.weeks[0]!.checklist[0] = { ...subject.weeks[0]!.checklist[0]!, done: false, doneAt: 5_000 }
    expect(mark(subject, 'first-check').earned).toBe(false)
  })

  it('earns a checkpoint mark only when the gate passed', () => {
    const subject = flutter()
    expect(mark(subject, 'first-gate').earned).toBe(false)
    subject.weeks[0]!.gate.passedAt = 7_000
    expect(mark(subject, 'first-gate').earned).toBe(true)
    expect(mark(subject, 'first-gate').earnedAt).toBe(7_000)
    expect(mark(subject, 'first-artefact').earned).toBe(true)
  })

  it('counts mastered concepts, not reviewed cards', () => {
    const subject = flutter()
    subject.nodes[0] = { ...subject.nodes[0]!, status: 'mastered', updatedAt: 9_000 }
    expect(mark(subject, 'first-concept').earned).toBe(true)
    expect(mark(subject, 'first-concept').earnedAt).toBe(9_000)
    expect(mark(subject, 'ten-concepts').earned).toBe(false)
  })

  it('keeps a mark through a pause, because no mark counts days', () => {
    const subject = flutter()
    subject.weeks[0]!.checklist[0] = { ...subject.weeks[0]!.checklist[0]!, done: true, doneAt: 1_000 }
    const before = milestonesFor(subject).filter((entry) => entry.earned).map((entry) => entry.id)
    const after = milestonesFor(subject).filter((entry) => entry.earned).map((entry) => entry.id)
    expect(after).toEqual(before)
    expect(before).not.toContain('half-work')
  })
})
