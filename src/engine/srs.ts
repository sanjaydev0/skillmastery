import type { Flashcard } from '../types/schema'
import { DAY_MS, endOfLocalDay } from '../lib/dates'

/** Days 1 → 3 → 6 → 10 → weekly, then weekly forever. */
export const SRS_INTERVALS = [1, 3, 6, 10, 7] as const

export type Grade = 'again' | 'hard' | 'good' | 'easy'

export function gradeCard(card: Flashcard, grade: Grade, at: number): Flashcard {
  const first = card.dueAt === 0
  const index = first ? 0 : Math.max(0, Math.min(SRS_INTERVALS.length - 1, card.scheduleStep))
  let step = index
  let dueAt: number
  if (grade === 'again') {
    step = 0
    dueAt = at + DAY_MS
  } else if (grade === 'hard') {
    dueAt = at + (SRS_INTERVALS[index] ?? 1) * DAY_MS
  } else {
    step = Math.min(SRS_INTERVALS.length - 1, index + (grade === 'easy' ? 2 : 1))
    dueAt = at + SRS_INTERVALS[step] * DAY_MS
  }
  return {
    ...card,
    scheduleStep: step,
    dueAt,
    lapses: card.lapses + (grade === 'again' ? 1 : 0),
    reviews: card.reviews + 1,
    updatedAt: at,
  }
}

export function isCardDue(card: Flashcard, now = Date.now()): boolean {
  return card.dueAt > 0 && card.dueAt <= endOfLocalDay(new Date(now))
}

export function dueCards(cards: Flashcard[], now = Date.now()): Flashcard[] {
  return cards.filter((card) => isCardDue(card, now)).sort((a, b) => a.dueAt - b.dueAt)
}

export function newCardDueAt(now = Date.now()): number {
  return now + DAY_MS
}

export function intervalLabel(step: number): string {
  const days = SRS_INTERVALS[Math.max(0, Math.min(SRS_INTERVALS.length - 1, step))]
  return days === 7 ? 'weekly' : `${days}d`
}
