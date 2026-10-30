import type { Subject } from '../types/schema'

/**
 * Progress marks.
 *
 * A mark is a fact about work that already exists, not a reward for opening the
 * app. Nothing here counts days, streaks or sessions, so a pause never takes a
 * mark away. `earnedAt` is the earliest piece of evidence that met the mark.
 */

export type MilestoneGroup = 'work' | 'checkpoints' | 'concepts'

export interface Milestone {
  id: string
  title: string
  /** How it is earned, in one plain sentence. */
  detail: string
  group: MilestoneGroup
  earned: boolean
  /** The earliest evidence, when the subject records it. */
  earnedAt?: number
  progress?: { done: number; total: number }
}

function earliest(values: Array<number | undefined>): number | undefined {
  const real = values.filter((value): value is number => typeof value === 'number')
  return real.length > 0 ? Math.min(...real) : undefined
}

function taskMark(
  id: string,
  title: string,
  detail: string,
  count: number,
  done: number,
  dates: number[],
): Milestone {
  const reachedAt = done >= count ? dates[count - 1] : undefined
  return {
    id,
    title,
    detail,
    group: 'work',
    earned: done >= count,
    ...(reachedAt !== undefined ? { earnedAt: reachedAt } : {}),
    progress: { done: Math.min(done, count), total: count },
  }
}

export function milestonesFor(subject: Subject): Milestone[] {
  const weeks = [...subject.weeks].sort((a, b) => a.weekNumber - b.weekNumber)
  const items = weeks.flatMap((week) => week.checklist)
  const checked = items.filter((item) => item.done)
  // Checking order is the only honest order for a count mark.
  const checkDates = checked
    .map((item) => item.doneAt)
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => a - b)

  const cleared = weeks.filter((week) => week.gate.passedAt)
  const firstGate = earliest(cleared.map((week) => week.gate.passedAt))
  const firstWeekOne = weeks.find((week) => week.weekNumber === 1)

  const mastered = subject.nodes.filter((node) => node.status === 'mastered')
  const firstMastered = earliest(mastered.map((node) => node.updatedAt ?? node.createdAt))

  const half = items.length > 0 && checked.length * 2 >= items.length
  const halfAt = half ? checkDates[Math.ceil(items.length / 2) - 1] : undefined

  return [
    taskMark('first-check', 'One real task', 'Check one task on any day.', 1, checked.length, checkDates),
    taskMark('ten-checks', 'Ten tasks', 'Check ten tasks across the course.', 10, checked.length, checkDates),
    taskMark(
      'forty-checks',
      'Forty tasks',
      'Check forty tasks across the course.',
      40,
      checked.length,
      checkDates,
    ),
    {
      id: 'half-work',
      title: 'Half the checklist',
      detail: 'Check half of every task in the course.',
      group: 'work',
      earned: half,
      ...(halfAt !== undefined ? { earnedAt: halfAt } : {}),
      progress: { done: checked.length, total: items.length },
    },
    {
      id: 'first-artefact',
      title: 'First artefact',
      detail: 'Clear the Week 1 checkpoint without notes.',
      group: 'checkpoints',
      earned: Boolean(firstWeekOne?.gate.passedAt),
      ...(firstWeekOne?.gate.passedAt ? { earnedAt: firstWeekOne.gate.passedAt } : {}),
    },
    {
      id: 'first-gate',
      title: 'First checkpoint',
      detail: 'Clear one week checkpoint without notes.',
      group: 'checkpoints',
      earned: cleared.length >= 1,
      ...(firstGate !== undefined ? { earnedAt: firstGate } : {}),
      progress: { done: Math.min(cleared.length, 1), total: 1 },
    },
    {
      id: 'four-gates',
      title: 'Four checkpoints',
      detail: 'Clear four week checkpoints.',
      group: 'checkpoints',
      earned: cleared.length >= 4,
      ...(cleared.length >= 4 && firstGate !== undefined ? { earnedAt: firstGate } : {}),
      progress: { done: Math.min(cleared.length, 4), total: 4 },
    },
    {
      id: 'half-gates',
      title: 'Half the route',
      detail: 'Clear half of the course checkpoints.',
      group: 'checkpoints',
      earned: weeks.length > 0 && cleared.length * 2 >= weeks.length,
      ...(firstGate !== undefined ? { earnedAt: firstGate } : {}),
      progress: { done: cleared.length, total: weeks.length },
    },
    {
      id: 'all-gates',
      title: 'Every checkpoint',
      detail: 'Clear the last week checkpoint.',
      group: 'checkpoints',
      earned: weeks.length > 0 && cleared.length === weeks.length,
      ...(firstGate !== undefined ? { earnedAt: firstGate } : {}),
      progress: { done: cleared.length, total: weeks.length },
    },
    {
      id: 'first-concept',
      title: 'One concept mastered',
      detail: 'Master one concept through a checkpoint or a review.',
      group: 'concepts',
      earned: mastered.length >= 1,
      ...(mastered.length >= 1 && firstMastered !== undefined ? { earnedAt: firstMastered } : {}),
      progress: { done: Math.min(mastered.length, 1), total: 1 },
    },
    {
      id: 'ten-concepts',
      title: 'Ten concepts',
      detail: 'Master ten concepts.',
      group: 'concepts',
      earned: mastered.length >= 10,
      ...(mastered.length >= 10 && firstMastered !== undefined ? { earnedAt: firstMastered } : {}),
      progress: { done: Math.min(mastered.length, 10), total: 10 },
    },
  ]
}

/** Marks earned so far, newest evidence first. */
export function earnedMilestones(subject: Subject): Milestone[] {
  return milestonesFor(subject)
    .filter((mark) => mark.earned)
    .sort((a, b) => (b.earnedAt ?? 0) - (a.earnedAt ?? 0))
}
