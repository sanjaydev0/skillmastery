import type { Concept, DaySlot, Subject, Week } from '../types/schema'
import { conceptsForWeek } from '../engine/concepts'
import { summariseSubject } from '../engine/estimates'
import { formatShortDate } from '../lib/dates'
import { DAY_MS } from '../lib/dates'

/**
 * A plain, human-readable copy of the record.
 *
 * This is deliberately not a backup: it cannot be imported, it holds no
 * settings, no prompt text and no credentials. It answers one question — what
 * did this learner actually prove, and when — so it can be read, printed or
 * kept outside the app.
 */

const DAY_SLOTS: DaySlot[] = [1, 2, 3, 4, 5, 6, 7]

function hours(minutes: number): string {
  const value = Math.round((minutes / 60) * 10) / 10
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function proofPhrase(at: number, now: number): string {
  const days = Math.round((now - at) / DAY_MS)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

function dayLine(week: Week, day: DaySlot, subject: Subject): string {
  const proof = subject.dayProofs.find((entry) => entry.weekId === week.id && entry.day === day)
  if (!proof) return `Day ${day} — —`
  const where =
    proof.outcome === 'cold'
      ? 'proved without notes'
      : proof.outcome === 'warm'
        ? 'proved with notes'
        : 'not yet'
  return `Day ${day} — ${where} (${formatShortDate(proof.at)})`
}

function conceptLine(concept: Concept, now: number): string {
  const last = concept.checks[concept.checks.length - 1]
  if (!last) return `${concept.term} — not proved`
  if (last.outcome === 'cold') return `${concept.term} — proved ${proofPhrase(last.at, now)}`
  if (last.outcome === 'warm') return `${concept.term} — with notes ${proofPhrase(last.at, now)}`
  return `${concept.term} — not yet (${formatShortDate(last.at)})`
}

export function recordToMarkdown(subject: Subject, now = Date.now()): string {
  const weeks = [...subject.weeks].sort((a, b) => a.weekNumber - b.weekNumber)
  const concepts = [...subject.concepts]
  const coldDays = subject.dayProofs.filter((proof) => proof.outcome === 'cold').length
  const provedConcepts = concepts.filter(
    (concept) => concept.checks[concept.checks.length - 1]?.outcome === 'cold',
  ).length
  const totals = summariseSubject(subject)

  const lines: string[] = [
    `# ${subject.name}`,
    '',
    `A record of work done without notes. Exported ${formatShortDate(now)}.`,
    '',
  ]

  for (const week of weeks) {
    const cleared = week.gate.passedAt
      ? `cleared ${formatShortDate(week.gate.passedAt)}`
      : 'not cleared yet'
    const cold = subject.dayProofs.filter(
      (proof) => proof.weekId === week.id && proof.outcome === 'cold',
    ).length
    lines.push(
      `## Week ${week.weekNumber} — ${week.title}`,
      '',
      `Checkpoint: ${cleared}.`,
      `Proof: ${cold} of 7 days without notes.`,
      '',
    )
    for (const day of DAY_SLOTS) {
      lines.push(dayLine(week, day, subject))
    }

    const weekConcepts = conceptsForWeek(concepts, week.weekNumber)
    lines.push('')
    if (weekConcepts.length === 0) {
      lines.push('Concepts: none recorded for this week.')
    } else {
      lines.push('Concepts:', ...weekConcepts.map((concept) => `- ${conceptLine(concept, now)}`))
    }

    if (week.review?.note) {
      lines.push('', `One sentence for next week: “${week.review.note}”`)
    }
    lines.push('')
  }

  lines.push(
    '## Totals',
    '',
    `- Days proved without notes: ${coldDays}`,
    `- Concepts proved: ${provedConcepts} of ${concepts.length}`,
    `- Hours credited from finished tasks: ${hours(totals.done.min)}–${hours(totals.done.max)} h`,
    '',
  )

  return lines.join('\n')
}
