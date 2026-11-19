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
  it('restores a week with its concepts, cards and day cards', () => {
    const target = week(2)
    const dependent = week(3)
    // Make a real cross-week link and prove the delete undoes it.
    useAppStore.setState({
      subjects: useAppStore.getState().subjects.map((subject) =>
        subject.id !== 'flutter'
          ? subject
          : {
              ...subject,
              weeks: subject.weeks.map((entry) =>
                entry.id === dependent.id
                  ? { ...entry, prerequisiteWeekIds: [...entry.prerequisiteWeekIds, target.id] }
                  : entry,
              ),
            },
      ),
    })
    expect(useAppStore.getState().saveDayPlans(target.id, dayPlans(), 'authored').ok).toBe(true)

    const conceptIds = new Set(
      flutter()
        .concepts.filter((concept) => concept.weekId === target.id)
        .map((concept) => concept.id),
    )
    expect(conceptIds.size).toBeGreaterThan(0)
    const cardCount = flutter().cards.filter((card) => card.weekId === target.id).length

    useAppStore.getState().deleteWeek(target.id)

    const afterDelete = flutter()
    expect(afterDelete.weeks.some((entry) => entry.id === target.id)).toBe(false)
    expect(afterDelete.concepts.some((concept) => concept.weekId === target.id)).toBe(false)
    expect(afterDelete.cards.some((card) => card.weekId === target.id)).toBe(false)
    expect(
      afterDelete.weeks.find((entry) => entry.id === dependent.id)!.prerequisiteWeekIds,
    ).not.toContain(target.id)
    // Day cards survive the delete in place, so the restore has nothing to rebuild.
    expect(useAppStore.getState().dayPlans[target.id]).toHaveLength(7)

    const entry = useAppStore.getState().trash[0]!
    expect(entry.kind).toBe('week')
    expect(entry.counts).toEqual({ concepts: conceptIds.size, dayProofs: 0, cards: cardCount, days: 7 })

    const restored = useAppStore.getState().restoreTrash(entry.id)
    expect(restored.ok).toBe(true)
    const after = flutter()
    expect(after.weeks).toHaveLength(24)
    expect(after.weeks.map((item) => item.weekNumber)).toEqual(
      Array.from({ length: 24 }, (_, index) => index + 1),
    )
    expect(after.concepts.filter((concept) => concept.weekId === target.id)).toHaveLength(conceptIds.size)
    expect(after.cards.filter((card) => card.weekId === target.id)).toHaveLength(cardCount)
    expect(after.weeks.find((item) => item.id === dependent.id)!.prerequisiteWeekIds).toContain(
      target.id,
    )
    expect(useAppStore.getState().dayPlans[target.id]).toHaveLength(7)
    expect(useAppStore.getState().trash).toHaveLength(0)
  })

  it('restores a deleted track with its weeks, concepts and cards', () => {
    // The seed ships one track now, so the deleted track is a created one.
    const created = useAppStore.getState().addSubject({
      name: 'Sketching',
      shortName: 'Sketch',
      tagline: 'Draw what you can see',
      accent: 'violet',
    })
    expect(created.ok).toBe(true)
    // addSubject switches to the new track, so the id is the active one.
    const id = useAppStore.getState().activeSubjectId
    const before = useAppStore.getState().subjects.find((subject) => subject.id === id)!

    expect(useAppStore.getState().deleteSubject(id).ok).toBe(true)
    expect(useAppStore.getState().subjects.some((subject) => subject.id === id)).toBe(false)

    const entry = useAppStore.getState().trash[0]!
    expect(entry.kind).toBe('subject')
    expect(entry.counts).toMatchObject({ weeks: before.weeks.length, concepts: 0, cards: 0 })

    expect(useAppStore.getState().restoreTrash(entry.id).ok).toBe(true)
    const back = useAppStore.getState().subjects.find((subject) => subject.id === id)!
    expect(back.weeks).toHaveLength(before.weeks.length)
    expect(back.concepts).toEqual([])
    expect(back.cards).toEqual([])
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
    // A card outside the deleted week that points at one of its concepts.
    const conceptId = flutter().concepts.find((concept) => concept.weekId === target.id)!.id
    useAppStore.setState({
      subjects: useAppStore.getState().subjects.map((subject) =>
        subject.id !== 'flutter'
          ? subject
          : {
              ...subject,
              cards: subject.cards.map((card) =>
                card.id === 'fl-c1-1' ? { ...card, nodeId: conceptId } : card,
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

describe('single-item undo', () => {
  it('restores a deleted resource', () => {
    const resource = flutter().resources[0]!
    const trashId = useAppStore.getState().deleteResource(resource.id)
    expect(trashId).toBeTruthy()
    expect(flutter().resources.some((entry) => entry.id === resource.id)).toBe(false)

    expect(useAppStore.getState().restoreTrash(trashId!).ok).toBe(true)
    expect(flutter().resources.some((entry) => entry.id === resource.id)).toBe(true)
  })
})
