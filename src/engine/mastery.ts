import type { GateAttempt, GateChecks, MasteryGate } from '../types/schema'
import { gatePass, gateWeakest } from './proofs'

/**
 * The checkpoint. Four questions, each answered with a plain yes or no. The
 * gate passes only when every answer is yes, because a week that cannot be
 * rebuilt without notes is not finished.
 */

export interface GateEvaluation {
  passed: boolean
  /** The questions answered no, in the order the sheet asks them. */
  weakest: (keyof GateChecks)[]
}

export function evaluateGate(checks: GateChecks): GateEvaluation {
  return { passed: gatePass(checks), weakest: gateWeakest(checks) }
}

export function recordAttempt(gate: MasteryGate, checks: GateChecks, at: number): MasteryGate {
  const evaluation = evaluateGate(checks)
  const attempt: GateAttempt = { at, checks, passed: evaluation.passed }
  const attempts = [...gate.attempts, attempt].slice(-12)
  return {
    ...gate,
    checks,
    attempts,
    passedAt: gate.passedAt ?? (evaluation.passed ? at : undefined),
  }
}
