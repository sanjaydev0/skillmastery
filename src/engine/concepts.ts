import type { Concept } from '../types/schema'
import type { WeekBlueprint } from '../data/curriculum/blueprint'

/**
 * The concept index is a lens over the authored route, never a second ledger.
 *
 * Concepts are derived from the blueprint: a term from `termsIntroduced` becomes
 * a concept only when the week actually teaches it — a knowledge point or one
 * of the three threads names it. API trivia from the day cards never becomes a
 * concept. The only learner data on a concept is its proof history.
 */

export function conceptSlug(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function termWords(term: string): string[] {
  return term
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** Substring match per word, so "binding" matches "bindings" and "guard clause" matches "guard clauses". */
function textMentions(haystack: string, term: string): boolean {
  const lower = haystack.toLowerCase()
  return termWords(term).every((word) => lower.includes(word))
}

function knowledgePointText(week: WeekBlueprint): string[] {
  return week.knowledgePoints.map(
    (point) => `${point.primitive} ${point.concept} ${point.failureMode}`,
  )
}

/** The three threads, the artefact and the checkpoint. Deliberately not `git`. */
function threadText(week: WeekBlueprint): string[] {
  return [week.dart, week.flutter, week.design, week.project, week.checkpoint, week.theme]
}

export function buildConcepts(
  blueprint: readonly WeekBlueprint[],
  weekIdFor: (weekNumber: number) => string,
): Concept[] {
  const concepts: Concept[] = []
  for (const week of blueprint) {
    const points = knowledgePointText(week)
    const threads = threadText(week)
    for (const raw of week.termsIntroduced) {
      const term = raw.trim()
      if (!term) continue
      const pointIndex = points.findIndex((text) => textMentions(text, term))
      const thread = threads.find((text) => textMentions(text, term))
      // A term nothing teaches is day-card trivia, not a concept.
      if (pointIndex === -1 && !thread) continue
      const point = pointIndex >= 0 ? week.knowledgePoints[pointIndex] : undefined
      concepts.push({
        id: `c-w${week.weekNumber}-${conceptSlug(term)}`,
        weekId: weekIdFor(week.weekNumber),
        weekNumber: week.weekNumber,
        term,
        definition: point?.concept ?? thread ?? week.theme,
        failureMode: point?.failureMode ?? '',
        checks: [],
        step: -1,
        dueAt: 0,
        createdAt: 0,
        updatedAt: 0,
      })
    }
  }
  return concepts
}

export function conceptsForWeek(concepts: Concept[], weekNumber: number): Concept[] {
  return concepts.filter((concept) => concept.weekNumber === weekNumber)
}
