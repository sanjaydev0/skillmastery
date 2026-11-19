import type { DayProof, DaySlot, GateChecks, ProofOutcome, Subject } from '../types/schema'
import { DAY_MS, startOfLocalDay } from '../lib/dates'

/**
 * The proof rules. Everything here is a fact the learner produced: an answer,
 * not a score. A cold proof ("without notes") is the only thing that advances
 * the review ladder, and only a cold day counts as proved.
 */

/** Days between reviews, indexed by ladder step. */
export const PROOF_INTERVALS = [1, 3, 7, 14, 30, 60] as const

export function nextProofStep(step: number, outcome: ProofOutcome): number {
  if (outcome === 'cold') return Math.min(step + 1, PROOF_INTERVALS.length - 1)
  if (outcome === 'warm') return Math.max(0, step - 1)
  return 0
}

/** The next due date is a whole local day away, never "in 23 hours". */
export function proofDueAt(step: number, at: number): number {
  if (step < 0) return 0
  const interval = PROOF_INTERVALS[Math.min(step, PROOF_INTERVALS.length - 1)] ?? 1
  return startOfLocalDay(new Date(at)) + interval * DAY_MS
}

export function proofLabel(outcome: ProofOutcome): string {
  if (outcome === 'cold') return 'Without notes'
  if (outcome === 'warm') return 'With notes'
  return 'Not yet'
}

export function dayProofFor(subject: Subject, weekId: string, day: DaySlot): DayProof | undefined {
  return subject.dayProofs.find((proof) => proof.weekId === weekId && proof.day === day)
}

export function dayIsProved(subject: Subject, weekId: string, day: DaySlot): boolean {
  return dayProofFor(subject, weekId, day)?.outcome === 'cold'
}

/**
 * The highest course day that carries evidence: a day proof or a checked task.
 * Evidence is stored per week slot, so it converts to a real course day here.
 * Returns 0 when the record is empty.
 */
export function recordDay(subject: Subject): number {
  const weekNumber = new Map(subject.weeks.map((week) => [week.id, week.weekNumber]))
  let highest = 0
  for (const proof of subject.dayProofs) {
    const number = weekNumber.get(proof.weekId)
    if (number) highest = Math.max(highest, (number - 1) * 7 + proof.day)
  }
  for (const week of subject.weeks) {
    for (const item of week.checklist) {
      if (item.done && item.day) {
        highest = Math.max(highest, (week.weekNumber - 1) * 7 + item.day)
      }
    }
  }
  return highest
}

/**
 * The checkpoint. Four questions, each answerable with an honest yes or no:
 * explain it, build it, finish it, fix it. All four yes clears the week.
 */
export const GATE_QUESTIONS = [
  {
    key: 'explain',
    label: 'Can you explain it in your own words?',
    detail: 'Say what it does and why, out loud, without reading anything.',
  },
  {
    key: 'build',
    label: 'Can you build it without the notes?',
    detail: 'Rebuild the week’s piece from an empty file.',
  },
  {
    key: 'finish',
    label: 'Does it look right on the phone?',
    detail: 'Run it on the real device and check the result yourself.',
  },
  {
    key: 'debug',
    label: 'Can you fix it when it breaks?',
    detail: 'Break it on purpose, read the error, and fix it.',
  },
] as const satisfies readonly { key: keyof GateChecks; label: string; detail: string }[]

export function gatePass(checks: GateChecks): boolean {
  return checks.explain && checks.build && checks.finish && checks.debug
}

export function gateWeakest(checks: GateChecks): (keyof GateChecks)[] {
  const order: (keyof GateChecks)[] = ['explain', 'build', 'finish', 'debug']
  return order.filter((key) => !checks[key])
}
