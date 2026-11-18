import { describe, expect, it } from 'vitest'
import {
  GATE_QUESTIONS,
  PROOF_INTERVALS,
  dayIsProved,
  dayProofFor,
  gatePass,
  gateWeakest,
  nextProofStep,
  proofDueAt,
  proofLabel,
} from './proofs'
import type { Subject } from '../types/schema'

const COLD_DAY = new Date(2026, 10, 18, 20, 30).getTime()

function subjectWithProofs(): Subject {
  return {
    id: 's',
    name: 'S',
    shortName: 'S',
    tagline: '',
    accent: 'sky',
    phases: [],
    weeks: [],
    nodes: [],
    concepts: [],
    dayProofs: [
      { weekId: 'w1', day: 1, at: 100, outcome: 'cold' },
      { weekId: 'w1', day: 2, at: 200, outcome: 'warm', note: 'needed the list' },
    ],
    cards: [],
    resources: [],
  }
}

describe('the proof ladder', () => {
  it('advances only on a cold proof', () => {
    expect(nextProofStep(-1, 'cold')).toBe(0)
    expect(nextProofStep(0, 'cold')).toBe(1)
    expect(nextProofStep(3, 'cold')).toBe(4)
    expect(nextProofStep(5, 'cold')).toBe(5)
  })

  it('steps back on a warm proof and restarts on a failure', () => {
    expect(nextProofStep(3, 'warm')).toBe(2)
    expect(nextProofStep(0, 'warm')).toBe(0)
    // A first attempt that needed notes still schedules tomorrow's review.
    expect(nextProofStep(-1, 'warm')).toBe(0)
    expect(nextProofStep(3, 'failed')).toBe(0)
  })

  it('schedules the next review from the local day, never the clock time', () => {
    expect(proofDueAt(0, COLD_DAY)).toBe(new Date(2026, 10, 19).getTime())
    expect(proofDueAt(2, COLD_DAY)).toBe(new Date(2026, 10, 25).getTime())
    expect(proofDueAt(-1, COLD_DAY)).toBe(0)
    expect(PROOF_INTERVALS[5]).toBe(60)
  })

  it('labels outcomes in plain words', () => {
    expect(proofLabel('cold')).toBe('Without notes')
    expect(proofLabel('warm')).toBe('With notes')
    expect(proofLabel('failed')).toBe('Not yet')
  })
})

describe('day proofs', () => {
  it('finds the proof for one week and one day only', () => {
    const subject = subjectWithProofs()
    expect(dayProofFor(subject, 'w1', 1)?.outcome).toBe('cold')
    expect(dayProofFor(subject, 'w1', 2)?.note).toBe('needed the list')
    expect(dayProofFor(subject, 'w1', 3)).toBeUndefined()
    expect(dayProofFor(subject, 'w2', 1)).toBeUndefined()
  })

  it('counts a day proved only without notes', () => {
    const subject = subjectWithProofs()
    expect(dayIsProved(subject, 'w1', 1)).toBe(true)
    expect(dayIsProved(subject, 'w1', 2)).toBe(false)
    expect(dayIsProved(subject, 'w1', 3)).toBe(false)
  })
})

describe('the four gate questions', () => {
  it('passes only when all four answers are yes', () => {
    expect(gatePass({ explain: true, build: true, finish: true, debug: true })).toBe(true)
    expect(gatePass({ explain: true, build: true, finish: false, debug: true })).toBe(false)
  })

  it('names the unanswered questions, in order', () => {
    expect(gateWeakest({ explain: true, build: false, finish: false, debug: true })).toEqual([
      'build',
      'finish',
    ])
  })

  it('asks four questions a learner can actually judge', () => {
    expect(GATE_QUESTIONS).toHaveLength(4)
    expect(GATE_QUESTIONS.map((question) => question.key)).toEqual(['explain', 'build', 'finish', 'debug'])
    for (const question of GATE_QUESTIONS) {
      expect(question.label).toMatch(/\?$/)
      expect(question.detail.length).toBeGreaterThan(0)
    }
  })
})
