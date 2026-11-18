import { describe, expect, it } from 'vitest'
import { buildConcepts, conceptSlug, conceptsForWeek } from './concepts'
import { FLUTTER_BLUEPRINT } from '../data/curriculum/blueprint'

const concepts = buildConcepts(FLUTTER_BLUEPRINT, (n) => `fl-w${n}`)

describe('the concept index', () => {
  it('creates at least two concepts for every blueprint week', () => {
    for (let n = 1; n <= 24; n++) {
      expect(conceptsForWeek(concepts, n).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('gives every concept a unique id, a term and a definition', () => {
    const ids = concepts.map((concept) => concept.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const concept of concepts) {
      expect(concept.term.length).toBeGreaterThan(0)
      expect(concept.definition.length).toBeGreaterThan(0)
      expect(concept.weekId).toBe(`fl-w${concept.weekNumber}`)
      expect(concept.checks).toEqual([])
      expect(concept.step).toBe(-1)
      expect(concept.dueAt).toBe(0)
    }
  })

  it('keeps only terms the week actually teaches', () => {
    const week1 = conceptsForWeek(concepts, 1).map((concept) => concept.term)
    expect(week1).toContain('final')
    expect(week1).toContain('null safety')
    // API trivia from the day cards is not a concept.
    expect(week1).not.toContain('padright')
    expect(week1).not.toContain('github')
  })

  it('derives the definition and the failure mode from the matching knowledge point', () => {
    const binding = conceptsForWeek(concepts, 1).find((concept) => concept.term === 'final')!
    expect(binding.definition).toMatch(/final locks the reference/)
    expect(binding.failureMode).toMatch(/final list/)
  })

  it('slugs terms into stable ids', () => {
    expect(conceptSlug('Null safety')).toBe('null-safety')
    expect(conceptSlug('  value equality  ')).toBe('value-equality')
  })
})
