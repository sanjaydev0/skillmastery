import type { GateAttempt, MasteryCategory, MasteryGate, MasteryScores } from '../types/schema'
import { MASTERY_CATEGORIES, averageScores, isGatePass } from '../lib/dates'

export interface GateEvaluation {
  average: number
  passed: boolean
  weakest: MasteryCategory
  blockers: string[]
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function evaluateGate(scores: MasteryScores): GateEvaluation {
  const average = round1(averageScores(scores))
  const passed = isGatePass(scores)
  const sorted = [...MASTERY_CATEGORIES].sort((a, b) => scores[a.key] - scores[b.key])
  const weakest = sorted[0]?.key ?? 'concept'
  const blockers: string[] = []
  if (average < 4) blockers.push('Average must be at least 4.0')
  for (const category of MASTERY_CATEGORIES) {
    if (scores[category.key] < 3) blockers.push(`${category.label} must be at least 3`)
  }
  return { average, passed, weakest, blockers }
}

export function recordAttempt(gate: MasteryGate, scores: MasteryScores, at: number): MasteryGate {
  const evaluation = evaluateGate(scores)
  const attempt: GateAttempt = {
    at,
    scores,
    average: evaluation.average,
    passed: evaluation.passed,
  }
  const attempts = [...gate.attempts, attempt].slice(-12)
  return {
    ...gate,
    scores,
    attempts,
    passedAt: gate.passedAt ?? (evaluation.passed ? at : undefined),
  }
}

export function emptyScores(value = 3): MasteryScores {
  return { concept: value, implementation: value, craft: value, debugging: value }
}
