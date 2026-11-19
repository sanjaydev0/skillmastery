import { describe, expect, it } from 'vitest'
import type { GateChecks, Week } from '../types/schema'
import { evaluateGate, recordAttempt } from './mastery'

function checks(values: Partial<GateChecks> = {}): GateChecks {
  return { explain: true, build: true, finish: true, debug: true, ...values }
}

const emptyGate: Week['gate'] = { attempts: [] }
const AT = 1_700_000_000_000

describe('mastery gate', () => {
  it('passes only when all four answers are yes', () => {
    expect(evaluateGate(checks()).passed).toBe(true)
    const weak = evaluateGate(checks({ debug: false, finish: false }))
    expect(weak.passed).toBe(false)
    expect(weak.weakest).toEqual(['finish', 'debug'])
  })

  it('records attempts and pins the first passing timestamp', () => {
    const failed = recordAttempt(emptyGate, checks({ debug: false }), AT)
    expect(failed.passedAt).toBeUndefined()
    expect(failed.attempts).toHaveLength(1)
    expect(failed.checks).toEqual(checks({ debug: false }))

    const passed = recordAttempt(failed, checks(), AT + 1000)
    expect(passed.passedAt).toBe(AT + 1000)
    expect(passed.attempts).toHaveLength(2)
    expect(passed.attempts[1]?.passed).toBe(true)

    const retry = recordAttempt(passed, checks({ explain: false }), AT + 2000)
    expect(retry.passedAt).toBe(AT + 1000)
  })

  it('keeps the most recent twelve attempts', () => {
    let gate = emptyGate
    for (let index = 0; index < 15; index++) {
      gate = recordAttempt(gate, checks({ explain: index % 2 === 0 }), AT + index)
    }
    expect(gate.attempts).toHaveLength(12)
    expect(gate.attempts[0]?.at).toBe(AT + 3)
    expect(gate.attempts.at(-1)?.at).toBe(AT + 14)
  })
})
