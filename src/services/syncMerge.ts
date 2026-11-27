import type {
  AppData,
  Book,
  ChecklistItem,
  Concept,
  DayPlan,
  DayProof,
  Flashcard,
  Resource,
  Subject,
  TrashEntry,
  Week,
} from '../types/schema'
import { TRASH_LIMIT } from '../types/schema'

/**
 * Cloud sync merge: monotonic in the only direction that matters.
 *
 * A check is never un-earned by a sync. A card never loses reviews. A gate that
 * passed stays passed. Device-local settings (theme, planner, journey) never
 * travel. Content that only exists remotely fills a gap; content that only
 * exists locally is kept.
 */

function keyById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

function unionById<T extends { id: string }>(
  local: T[],
  remote: T[],
  merge: (a: T, b: T) => T,
): T[] {
  const merged = new Map(keyById(local))
  for (const item of remote) {
    const current = merged.get(item.id)
    merged.set(item.id, current ? merge(current, item) : item)
  }
  return [...merged.values()]
}

function unionByKey<T>(local: T[], remote: T[], key: (item: T) => string): T[] {
  const merged = new Map(local.map((item) => [key(item), item]))
  for (const item of remote) {
    if (!merged.has(key(item))) merged.set(key(item), item)
  }
  return [...merged.values()]
}

function minDefined(...values: Array<number | undefined>): number | undefined {
  const present = values.filter((value): value is number => typeof value === 'number')
  return present.length ? Math.min(...present) : undefined
}

function mergeChecklist(a: ChecklistItem, b: ChecklistItem): ChecklistItem {
  const at = a.touchedAt
  const bt = b.touchedAt

  // Items written before v9 carry no touch time: keep the old monotonic rule
  // so an older device can never un-earn a check.
  if (at === undefined && bt === undefined) {
    const done = a.done || b.done
    if (!done) {
      const { doneAt: _ignored, ...rest } = a
      return { ...rest, done: false }
    }
    const doneAt = minDefined(a.doneAt, b.doneAt)
    return { ...a, done: true, ...(doneAt !== undefined ? { doneAt } : {}) }
  }

  // The newest touch wins, so an uncheck on one device survives the merge.
  const base = (at ?? 0) >= (bt ?? 0) ? a : b
  if (!base.done) {
    const { doneAt: _ignored, ...rest } = base
    return { ...rest, done: false }
  }
  return { ...base, done: true, ...(base.doneAt !== undefined ? { doneAt: base.doneAt } : {}) }
}

function mergeWeek(a: Week, b: Week): Week {
  const checksA = a.gate.checks
  const checksB = b.gate.checks
  const passedAt = minDefined(a.gate.passedAt, b.gate.passedAt)
  const review =
    (a.review?.at ?? 0) >= (b.review?.at ?? 0) ? a.review : b.review

  return {
    ...a,
    checklist: unionById(a.checklist, b.checklist, mergeChecklist),
    gate: {
      ...a.gate,
      ...(checksA || checksB
        ? {
            checks: {
              explain: Boolean(checksA?.explain || checksB?.explain),
              build: Boolean(checksA?.build || checksB?.build),
              finish: Boolean(checksA?.finish || checksB?.finish),
              debug: Boolean(checksA?.debug || checksB?.debug),
            },
          }
        : {}),
      attempts: unionByKey(a.gate.attempts, b.gate.attempts, (attempt) => String(attempt.at)),
      ...(passedAt !== undefined ? { passedAt } : {}),
      notes: a.gate.notes ?? b.gate.notes,
    },
    ...(review ? { review } : {}),
  }
}

function mergeConcept(a: Concept, b: Concept): Concept {
  const checks = unionByKey(a.checks, b.checks, (check) => `${check.at}:${check.outcome}`).sort(
    (x, y) => x.at - y.at,
  )
  return {
    ...a,
    checks,
    step: Math.max(a.step, b.step),
    dueAt: Math.max(a.dueAt, b.dueAt),
    notes: a.notes ?? b.notes,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  }
}

function mergeCard(a: Flashcard, b: Flashcard): Flashcard {
  const pick = a.reviews !== b.reviews ? (a.reviews > b.reviews ? a : b) : a.updatedAt >= b.updatedAt ? a : b
  return {
    ...pick,
    createdAt: Math.min(a.createdAt, b.createdAt),
    lapses: Math.max(a.lapses, b.lapses),
    reviews: Math.max(a.reviews, b.reviews),
    scheduleStep: Math.max(a.scheduleStep, b.scheduleStep),
    dueAt: Math.max(a.dueAt, b.dueAt),
  }
}

function mergeDayProofs(a: DayProof[], b: DayProof[]): DayProof[] {
  const merged = new Map(a.map((proof) => [`${proof.weekId}:${proof.day}`, proof]))
  for (const proof of b) {
    const key = `${proof.weekId}:${proof.day}`
    const current = merged.get(key)
    if (!current || proof.at > current.at) merged.set(key, proof)
  }
  return [...merged.values()]
}

function mergeResource(a: Resource, b: Resource): Resource {
  // Reading status is local progress; the remote copy only fills a gap.
  return { ...b, ...a }
}

const BOOK_RANK: Record<Book['status'], number> = { toRead: 0, reading: 1, done: 2 }

function mergeBook(a: Book, b: Book): Book {
  const status = BOOK_RANK[a.status] >= BOOK_RANK[b.status] ? a.status : b.status
  return {
    ...a,
    currentChapter: Math.max(a.currentChapter, b.currentChapter),
    status,
    notes: a.notes ?? b.notes,
  }
}

function mergeSubject(a: Subject, b: Subject, deletedWeeks: Set<string>): Subject {
  return {
    ...a,
    weeks: unionById(a.weeks, b.weeks, mergeWeek).filter((week) => !deletedWeeks.has(week.id)),
    concepts: unionById(a.concepts, b.concepts, mergeConcept),
    dayProofs: mergeDayProofs(a.dayProofs, b.dayProofs),
    cards: unionById(a.cards, b.cards, mergeCard),
    resources: unionById(a.resources, b.resources, mergeResource),
  }
}

function mergeDayPlans(local: AppData['dayPlans'], remote: AppData['dayPlans']): AppData['dayPlans'] {
  const merged: AppData['dayPlans'] = { ...remote, ...local }
  for (const [weekId, plans] of Object.entries(remote)) {
    if (!merged[weekId] || merged[weekId]!.length === 0) merged[weekId] = plans
  }
  return merged
}

function mergeTrash(local: TrashEntry[], remote: TrashEntry[]): TrashEntry[] {
  return unionById(local, remote, (a, b) => (a.deletedAt >= b.deletedAt ? a : b))
    .sort((a, b) => b.deletedAt - a.deletedAt)
    .slice(0, TRASH_LIMIT)
}

export function mergeAppData(local: AppData, remote: AppData): AppData {
  const deletedWeeks = new Set(
    [...local.trash, ...remote.trash]
      .filter((entry) => entry.kind === 'week')
      .map((entry) => (entry.payload as Week).id),
  )

  const subjects = unionById(local.subjects, remote.subjects, (a, b) =>
    mergeSubject(a, b, deletedWeeks),
  )

  const dailyLog: AppData['dailyLog'] = { ...remote.dailyLog, ...local.dailyLog }
  for (const [key, value] of Object.entries(remote.dailyLog)) {
    const current = local.dailyLog[key]
    if (!current) continue
    dailyLog[key] = { items: Array.from(new Set([...current.items, ...value.items])) }
  }

  const activeSubjectId = subjects.some((subject) => subject.id === local.activeSubjectId)
    ? local.activeSubjectId
    : (subjects[0]?.id ?? local.activeSubjectId)

  return {
    ...local,
    activeSubjectId,
    subjects,
    books: unionById(local.books, remote.books, mergeBook),
    dailyLog,
    // This device owns its one-line bug notes for a shared date.
    bugLog: { ...remote.bugLog, ...local.bugLog },
    overrides: { weeks: { ...remote.overrides.weeks, ...local.overrides.weeks } },
    promptOverrides: { ...remote.promptOverrides, ...local.promptOverrides },
    dayPlans: mergeDayPlans(local.dayPlans, remote.dayPlans),
    trash: mergeTrash(local.trash, remote.trash),
    schemaVersion: Math.max(local.schemaVersion, remote.schemaVersion),
    seedVersion: Math.max(local.seedVersion, remote.seedVersion),
    createdAt: Math.min(local.createdAt, remote.createdAt),
    updatedAt: Date.now(),
  }
}

/** The two documents a push writes, kept small enough for the 1 MB limit. */
export function splitForCloud(data: AppData): {
  core: Omit<AppData, 'dayPlans'>
  dayPlans: DayPlan[][]
  weeks: string[]
} {
  const { dayPlans, ...core } = data
  const weeks = Object.keys(dayPlans)
  return { core, dayPlans: weeks.map((weekId) => dayPlans[weekId]!), weeks }
}
