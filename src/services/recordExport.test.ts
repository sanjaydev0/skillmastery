import { describe, expect, it } from 'vitest'
import type { Subject } from '../types/schema'
import { createSeedData } from '../data/seedData'
import { recordToMarkdown } from './recordExport'

function activeSubject(): Subject {
  const seed = createSeedData()
  return seed.subjects.find((subject) => subject.id === seed.activeSubjectId)!
}

describe('the record export', () => {
  it('writes weeks, proofs and concepts without any key material', () => {
    const md = recordToMarkdown(activeSubject())
    expect(md).toContain('# Flutter, Dart & High-Craft UI/UX')
    expect(md).toContain('## Week 1')
    expect(md).toContain('Proof:')
    expect(md).toContain('Checkpoint:')
    expect(md.toLowerCase()).not.toContain('api key')
    expect(md.toLowerCase()).not.toContain('sk-')
  })

  it('records a cold day, a warm day and a blank day', () => {
    const subject = activeSubject()
    const week = subject.weeks[0]!
    const now = new Date(2026, 10, 18, 20, 0).getTime()
    subject.dayProofs = [
      { weekId: week.id, day: 1, at: now - 9 * 86_400_000, outcome: 'cold' },
      { weekId: week.id, day: 2, at: now - 86_400_000, outcome: 'warm' },
    ]
    const md = recordToMarkdown(subject, now)
    expect(md).toContain('Day 1 — proved without notes')
    expect(md).toContain('Day 2 — proved with notes')
    expect(md).toContain('Day 3 — —')
    expect(md).toContain('Proof: 1 of 7 days without notes.')
  })

  it('names an unproved concept honestly and carries the review note', () => {
    const subject = activeSubject()
    const week = subject.weeks[0]!
    const concept = subject.concepts.find((entry) => entry.weekId === week.id)!
    concept.checks = []
    week.review = { at: Date.now(), note: 'Null checks are still slow.' }
    const md = recordToMarkdown(subject)
    expect(md).toContain(`${concept.term} — not proved`)
    expect(md).toContain('One sentence for next week: “Null checks are still slow.”')
  })

  it('closes with totals instead of settings or prompts', () => {
    const subject = activeSubject()
    const md = recordToMarkdown(subject)
    expect(md).toContain('## Totals')
    expect(md).toContain('Days proved without notes: 0')
    expect(md).toContain(`Concepts proved: 0 of ${subject.concepts.length}`)
    expect(md).toContain('Hours credited from finished tasks:')
    expect(md).not.toContain('weeklyActiveMinutes')
    expect(md).not.toContain('promptOverrides')
  })
})
