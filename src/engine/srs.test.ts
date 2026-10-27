import { describe, expect, it } from 'vitest'
import type { Flashcard } from '../types/schema'
import { DAY_MS, endOfLocalDay } from '../lib/dates'
import { SRS_INTERVALS, dueCards, gradeCard, intervalLabel, isCardDue, newCardDueAt } from './srs'

const AT = new Date(2026, 9, 27, 12, 0, 0).getTime()

function card(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'card-1',
    front: 'Front',
    back: 'Back',
    tags: [],
    source: 'core',
    scheduleStep: 0,
    dueAt: 0,
    lapses: 0,
    reviews: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('SRS ladder', () => {
  it('uses 1, 3, 6, 10, then weekly intervals', () => {
    expect(SRS_INTERVALS).toEqual([1, 3, 6, 10, 7])
    expect(intervalLabel(0)).toBe('1d')
    expect(intervalLabel(1)).toBe('3d')
    expect(intervalLabel(4)).toBe('weekly')
  })

  it('schedules a new card and advances on good/easy', () => {
    const first = gradeCard(card(), 'good', AT)
    expect(first.scheduleStep).toBe(1)
    expect(first.dueAt).toBe(AT + 3 * DAY_MS)
    expect(first.reviews).toBe(1)

    const easy = gradeCard(card({ scheduleStep: 0 }), 'easy', AT)
    expect(easy.scheduleStep).toBe(2)
    expect(easy.dueAt).toBe(AT + 6 * DAY_MS)
  })

  it('resets to step zero and increments lapses on again', () => {
    const lapsed = gradeCard(card({ scheduleStep: 3, lapses: 2, dueAt: AT }), 'again', AT)
    expect(lapsed.scheduleStep).toBe(0)
    expect(lapsed.dueAt).toBe(AT + DAY_MS)
    expect(lapsed.lapses).toBe(3)
  })

  it('keeps the current interval on hard', () => {
    const hard = gradeCard(card({ scheduleStep: 2, dueAt: AT }), 'hard', AT)
    expect(hard.scheduleStep).toBe(2)
    expect(hard.dueAt).toBe(AT + 6 * DAY_MS)
  })

  it('only counts cards with a due date at or before the end of today', () => {
    const due = card({ dueAt: endOfLocalDay(new Date(AT)) })
    const future = card({ id: 'card-2', dueAt: AT + 2 * DAY_MS })
    const newCard = card({ id: 'card-3', dueAt: 0 })
    expect(isCardDue(due, AT)).toBe(true)
    expect(isCardDue(future, AT)).toBe(false)
    expect(isCardDue(newCard, AT)).toBe(false)
    expect(dueCards([future, due], AT).map((entry) => entry.id)).toEqual(['card-1'])
  })

  it('schedules newly added cards for tomorrow', () => {
    expect(newCardDueAt(AT)).toBe(AT + DAY_MS)
  })
})
