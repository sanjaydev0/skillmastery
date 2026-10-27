import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION, SEED_VERSION } from '../types/schema'
import { createSeedData } from './seedData'

const seed = createSeedData()

describe('seed integrity', () => {
  it('ships two self-contained 24-week tracks with four phases each', () => {
    expect(seed.subjects).toHaveLength(2)
    expect(seed.schemaVersion).toBe(SCHEMA_VERSION)
    expect(seed.seedVersion).toBe(SEED_VERSION)
    for (const subject of seed.subjects) {
      expect(subject.phases).toHaveLength(4)
      expect(subject.weeks).toHaveLength(24)
      expect(subject.nodes.length).toBeGreaterThan(20)
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

  it('has referentially valid weeks, nodes, cards and resources', () => {
    for (const subject of seed.subjects) {
      const weekIds = new Set(subject.weeks.map((week) => week.id))
      const nodeIds = new Set(subject.nodes.map((node) => node.id))
      const phaseIds = new Set(subject.phases.map((phase) => phase.id))
      const weekNumber = new Map(subject.weeks.map((week) => [week.id, week.weekNumber]))

      for (const week of subject.weeks) {
        expect(phaseIds.has(week.phaseId)).toBe(true)
        for (const prerequisite of week.prerequisiteWeekIds) {
          expect(weekNumber.has(prerequisite)).toBe(true)
          expect(weekNumber.get(prerequisite)!).toBeLessThan(week.weekNumber)
        }
        for (const nodeId of week.encompassedNodeIds) expect(nodeIds.has(nodeId)).toBe(true)
      }

      for (const node of subject.nodes) {
        expect(weekIds.has(node.weekId)).toBe(true)
        for (const prerequisite of node.prerequisiteIds) {
          expect(nodeIds.has(prerequisite)).toBe(true)
          expect(prerequisite).not.toBe(node.id)
        }
        for (const encompassed of node.encompassedNodeIds) expect(nodeIds.has(encompassed)).toBe(true)
        expect(node.knowledgePoints.length).toBeGreaterThan(0)
        expect(node.status).toBe('locked')
        expect(node.srs.dueAt).toBe(0)
      }

      for (const card of subject.cards) {
        if (card.weekId) expect(weekIds.has(card.weekId)).toBe(true)
        if (card.nodeId) expect(nodeIds.has(card.nodeId)).toBe(true)
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
        ...subject.nodes.map((node) => node.id),
        ...subject.cards.map((card) => card.id),
        ...subject.resources.map((resource) => resource.id),
      ]
      expect(new Set(ids).size).toBe(ids.length)
    }
    expect(new Set(seed.subjects.map((subject) => subject.id)).size).toBe(2)
    expect(seed.books.length).toBeGreaterThan(0)
    for (const book of seed.books) {
      expect(() => new URL(book.url)).not.toThrow()
      expect(book.weekFrom).toBeLessThanOrEqual(book.weekTo)
      expect(book.currentChapter).toBeLessThanOrEqual(book.totalChapters)
    }
    expect(seed.activeSubjectId).toBe(seed.subjects[0]!.id)
  })
})
