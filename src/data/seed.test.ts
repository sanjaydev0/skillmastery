import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, SEED_VERSION } from '../types/schema'
import { createSeedData } from './seedData'

const seed = createSeedData()

describe('seed integrity', () => {
  it('ships one self-contained 24-week track with four phases', () => {
    expect(seed.subjects).toHaveLength(1)
    expect(seed.schemaVersion).toBe(SCHEMA_VERSION)
    expect(seed.seedVersion).toBe(SEED_VERSION)
    for (const subject of seed.subjects) {
      expect(subject.phases).toHaveLength(4)
      expect(subject.weeks).toHaveLength(24)
      expect(subject.concepts.length).toBeGreaterThanOrEqual(100)
      expect(subject.cards.length).toBeGreaterThan(20)
      expect(subject.resources.length).toBeGreaterThan(0)
      expect(new Set(subject.weeks.map((week) => week.weekNumber))).toEqual(
        new Set(Array.from({ length: 24 }, (_, index) => index + 1)),
      )
    }
  })

  it('keeps Phases 1–2 rich and Phases 3–4 compact', () => {
    for (const subject of seed.subjects) {
      for (const week of subject.weeks) {
        const phaseIndex = subject.phases.findIndex((phase) => phase.id === week.phaseId)
        expect(phaseIndex).toBeGreaterThanOrEqual(0)
        expect(week.detail).toBe(phaseIndex < 2 ? 'full' : 'compact')
      }
    }
  })

  it('has referentially valid weeks, concepts, cards and resources', () => {
    for (const subject of seed.subjects) {
      const weekIds = new Set(subject.weeks.map((week) => week.id))
      const conceptIds = new Set(subject.concepts.map((concept) => concept.id))
      const phaseIds = new Set(subject.phases.map((phase) => phase.id))
      const weekNumber = new Map(subject.weeks.map((week) => [week.id, week.weekNumber]))

      for (const week of subject.weeks) {
        expect(phaseIds.has(week.phaseId)).toBe(true)
        for (const prerequisite of week.prerequisiteWeekIds) {
          expect(weekNumber.has(prerequisite)).toBe(true)
          expect(weekNumber.get(prerequisite)!).toBeLessThan(week.weekNumber)
        }
      }

      for (const concept of subject.concepts) {
        expect(weekIds.has(concept.weekId)).toBe(true)
        expect(weekNumber.get(concept.weekId)).toBe(concept.weekNumber)
        expect(concept.term.length).toBeGreaterThan(0)
        expect(concept.definition.length).toBeGreaterThan(0)
        // A fresh seed carries no invented proof and no scheduled review.
        expect(concept.checks).toEqual([])
        expect(concept.step).toBe(-1)
        expect(concept.dueAt).toBe(0)
      }

      for (const card of subject.cards) {
        if (card.weekId) expect(weekIds.has(card.weekId)).toBe(true)
        if (card.nodeId) expect(conceptIds.has(card.nodeId)).toBe(true)
        expect(card.dueAt).toBe(0)
      }

      for (const resource of subject.resources) {
        expect(() => new URL(resource.url)).not.toThrow()
        if (resource.weekId) expect(weekIds.has(resource.weekId)).toBe(true)
      }
    }
  })

  it('has unique ids and valid shared books', () => {
    for (const subject of seed.subjects) {
      const ids = [
        ...subject.phases.map((phase) => phase.id),
        ...subject.weeks.map((week) => week.id),
        ...subject.concepts.map((concept) => concept.id),
        ...subject.cards.map((card) => card.id),
        ...subject.resources.map((resource) => resource.id),
      ]
      expect(new Set(ids).size).toBe(ids.length)
    }
    expect(seed.books.length).toBeGreaterThan(0)
    for (const book of seed.books) {
      expect(() => new URL(book.url)).not.toThrow()
      expect(book.weekFrom).toBeLessThanOrEqual(book.weekTo)
      expect(book.currentChapter).toBeLessThanOrEqual(book.totalChapters)
    }
    expect(seed.activeSubjectId).toBe(seed.subjects[0]!.id)
  })
})
