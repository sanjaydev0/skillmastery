import { beforeEach, describe, expect, it } from 'vitest'
import { createSeedData } from '../data/seedData'
import { clearHistory } from '../services/history'
import type { DayPlan, Subject, Week } from '../types/schema'
import { TRASH_LIMIT } from '../types/schema'
import { useAppStore } from './AppStore'

function resetStore(): void {
  clearHistory()
  useAppStore.setState({ ...createSeedData(), hydrated: true })
}

beforeEach(resetStore)

function flutter(): Subject {
  return useAppStore.getState().subjects.find((subject) => subject.id === 'flutter')!
}

function week(number: number): Week {
  return flutter().weeks.find((entry) => entry.weekNumber === number)!
}

function dayPlans(): DayPlan[] {
  return Array.from({ length: 7 }, (_, index) => ({
    day: (index + 1) as DayPlan['day'],
    title: `Day ${index + 1}`,
    summary: `The plan for day ${index + 1}.`,
    resources: [],
    tasks: [`Task ${index + 1}`],
    direction: 'Do this, not that.',
    designNote: 'One number owns the screen.',
    estMinutes: 60,
    origin: 'authored' as const,
  }))
}

describe('trash round trip', () => {
  it('restores a week with its nodes, cards, graph edges and day cards', () => {
    const target = week(2)
    const dependent = week(3)
    // The authored seed keeps node prerequisites inside one week, so make a
    // real cross-week edge and prove the delete undoes it.
    useAppStore.setState({
      subjects: useAppStore.getState().subjects.map((subject) =>
        subject.id !== 'flutter'
          ? subject
          : {
              ...subject,
              nodes: subject.nodes.map((node) =>
                node.id === 'fl-w3-n1' ? { ...node, prerequisiteIds: ['fl-w2-n3'] } : node,
              ),
            },
      ),
    })
    expect(useAppStore.getState().saveDayPlans(target.id, dayPlans(), 'authored').ok).toBe(true)

    const nodeIds = new Set(
      flutter()
        .nodes.filter((node) => node.weekId === target.id)
        .map((node) => node.id),
    )
    expect(nodeIds.size).toBeGreaterThan(0)

    useAppStore.getState().deleteWeek(target.id)

    const afterDelete = flutter()
    expect(afterDelete.weeks.some((entry) => entry.id === target.id)).toBe(false)
    expect(afterDelete.nodes.some((node) => node.weekId === target.id)).toBe(false)
    expect(afterDelete.cards.some((card) => card.weekId === target.id)).toBe(false)
    expect(
      afterDelete.weeks.find((entry) => entry.id === dependent.id)!.prerequisiteWeekIds,
    ).not.toContain(target.id)
    expect(afterDelete.nodes.find((node) => node.id === 'fl-w3-n1')!.prerequisiteIds).not.toContain(
      'fl-w2-n3',
    )
    // Day cards survive the delete in place, so the restore has nothing to rebuild.
    expect(useAppStore.getState().dayPlans[target.id]).toHaveLength(7)

    const entry = useAppStore.getState().trash[0]!
    expect(entry.kind).toBe('week')
    expect(entry.counts).toEqual({ nodes: nodeIds.size, cards: 5, days: 7 })

    const restored = useAppStore.getState().restoreTrash(entry.id)
    expect(restored.ok).toBe(true)
    const after = flutter()
    expect(after.weeks).toHaveLength(24)
    expect(after.weeks.map((item) => item.weekNumber)).toEqual(
      Array.from({ length: 24 }, (_, index) => index + 1),
    )
    expect(after.nodes.filter((node) => node.weekId === target.id)).toHaveLength(nodeIds.size)
    expect(after.cards.filter((card) => card.weekId === target.id)).toHaveLength(5)
    expect(after.weeks.find((item) => item.id === dependent.id)!.prerequisiteWeekIds).toContain(
      target.id,
    )
    expect(after.nodes.find((node) => node.id === 'fl-w3-n1')!.prerequisiteIds).toContain('fl-w2-n3')
    expect(useAppStore.getState().dayPlans[target.id]).toHaveLength(7)
    expect(useAppStore.getState().trash).toHaveLength(0)
  })

  it('restores a deleted track with its weeks, nodes and cards', () => {
    const fullstack = useAppStore.getState().subjects.find((subject) => subject.id === 'fullstack')!
    const counts = {
      weeks: fullstack.weeks.length,
      nodes: fullstack.nodes.length,
      cards: fullstack.cards.length,
    }

    expect(useAppStore.getState().deleteSubject('fullstack').ok).toBe(true)
    expect(useAppStore.getState().subjects.some((subject) => subject.id === 'fullstack')).toBe(false)

    const entry = useAppStore.getState().trash[0]!
    expect(entry.kind).toBe('subject')
    expect(entry.counts).toMatchObject(counts)

    expect(useAppStore.getState().restoreTrash(entry.id).ok).toBe(true)
    const back = useAppStore.getState().subjects.find((subject) => subject.id === 'fullstack')!
    expect(back.weeks).toHaveLength(counts.weeks)
    expect(back.nodes).toHaveLength(counts.nodes)
    expect(back.cards).toHaveLength(counts.cards)
  })

  it('moves day cards to trash and puts them back once', () => {
    const subject = flutter()
    const target = week(1)
    expect(useAppStore.getState().saveDayPlans(target.id, dayPlans(), 'authored').ok).toBe(true)
    expect(subject.id).toBe('flutter')

    expect(useAppStore.getState().deleteDayPlans(target.id).ok).toBe(true)
    expect(useAppStore.getState().dayPlans[target.id]).toBeUndefined()

    const entry = useAppStore.getState().trash[0]!
    expect(entry.kind).toBe('dayPlans')
    expect(entry.counts.days).toBe(7)

    expect(useAppStore.getState().restoreTrash(entry.id).ok).toBe(true)
    expect(useAppStore.getState().dayPlans[target.id]).toHaveLength(7)

    // The entry is gone, so a second restore cannot duplicate the cards.
    expect(useAppStore.getState().restoreTrash(entry.id).ok).toBe(false)
  })

  it('drops the day cards of a week that is purged, not restored', () => {
    const target = week(2)
    useAppStore.getState().saveDayPlans(target.id, dayPlans(), 'authored')
    // A card outside the deleted week that points at one of its nodes.
    useAppStore.setState({
      subjects: useAppStore.getState().subjects.map((subject) =>
        subject.id !== 'flutter'
          ? subject
          : {
              ...subject,
              cards: subject.cards.map((card) =>
                card.id === 'fl-c1-1' ? { ...card, nodeId: 'fl-w2-n1' } : card,
              ),
            },
      ),
    })

    useAppStore.getState().deleteWeek(target.id)
    const entry = useAppStore.getState().trash[0]!
    useAppStore.getState().purgeTrash(entry.id)

    expect(useAppStore.getState().dayPlans[target.id]).toBeUndefined()
    expect(useAppStore.getState().trash).toHaveLength(0)
    const card = flutter().cards.find((item) => item.id === 'fl-c1-1')!
    expect(card.nodeId).toBeUndefined()
  })

  it('keeps the newest entries and drops the oldest at the limit', () => {
    const ids = flutter().weeks.map((entry) => entry.id)
    for (const id of ids.slice(0, TRASH_LIMIT + 1)) {
      useAppStore.getState().deleteWeek(id)
    }
    const trash = useAppStore.getState().trash
    expect(trash).toHaveLength(TRASH_LIMIT)
    // Newest first: the last week deleted is the first entry.
    expect((trash[0]!.payload as Week).id).toBe(ids[TRASH_LIMIT])
    expect(trash.some((entry) => (entry.payload as Week).id === ids[0])).toBe(false)
  })
})
