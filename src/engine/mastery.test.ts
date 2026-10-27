import { describe, expect, it } from 'vitest'
import type { MasteryScores, Week } from '../types/schema'
import { evaluateGate, emptyScores, recordAttempt } from './mastery'

function scores(values: Partial<MasteryScores> = {}): MasteryScores {
  return { ...emptyScores(4), ...values }
}

const emptyGate: Week['gate'] = { attempts: [] }
const AT = 1_700_000_000_000

describe('mastery gate', () => {
  it('passes only when the average is at least 4.0 and no score is below 3', () => {
    expect(evaluateGate(scores()).passed).toBe(true)
    expect(evaluateGate(scores({ concept: 5, implementation: 5, craft: 3, debugging: 3 })).passed).toBe(true)

    const weak = evaluateGate(scores({ concept: 5, implementation: 5, craft: 5, debugging: 2 }))
    expect(weak.average).toBe(4.3)
    expect(weak.passed).toBe(false)
    expect(weak.blockers).toContain('Debugging must be at least 3')

    const low = evaluateGate(scores({ concept: 3, implementation: 3, craft: 3, debugging: 3 }))
    expect(low.average).toBe(3)
    expect(low.passed).toBe(false)
    expect(low.blockers).toContain('Average must be at least 4.0')
  })

  it('records attempts and pins the first passing timestamp', () => {
    const failed = recordAttempt(emptyGate, scores({ debugging: 2 }), AT)
    expect(failed.passedAt).toBeUndefined()
    expect(failed.attempts).toHaveLength(1)

    const passed = recordAttempt(failed, scores(), AT + 1000)
    expect(passed.passedAt).toBe(AT + 1000)
    expect(passed.attempts).toHaveLength(2)
    expect(passed.attempts[1]?.passed).toBe(true)

    const retry = recordAttempt(passed, scores({ concept: 5 }), AT + 2000)
    expect(retry.passedAt).toBe(AT + 1000)
  })

  it('keeps the most recent twelve attempts', () => {
    let gate = emptyGate
    for (let index = 0; index < 15; index++) {
      gate = recordAttempt(gate, scores({ concept: index }), AT + index)
    }
    expect(gate.attempts).toHaveLength(12)
    expect(gate.attempts[0]?.at).toBe(AT + 3)
    expect(gate.attempts.at(-1)?.at).toBe(AT + 14)
  })
})
