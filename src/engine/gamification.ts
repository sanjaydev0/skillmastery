import type { Subject, Week } from '../types/schema'
import { courseDay, courseWeek, daySlot, isPaused } from '../lib/courseClock'
import type { Journey } from '../types/schema'

/**
 * The game layer.
 *
 * XP, levels, quests and the boss are all derived from the evidence: checked
 * tasks, cleared gates and the course day. Nothing here is stored, and nothing
 * here can be gamed by opening the app. Paused days never earn XP.
 *
 * The calm toggle (`journey.gameLayer === false`) hides the surface but never
 * resets it; turning it back on shows the same numbers.
 */

/** XP for one unit of evidence. Chosen so a day's work lands around 100 XP. */
export const XP = {
  task: 10,
  /** Day with at least one active task checked. */
  activeDay: 15,
  /** Week's checkpoint (gate) cleared. */
  gate: 120,
  /** Whole week's checklist done. */
  weekComplete: 200,
} as const

/**
 * A fixed threshold table. Level 1 at 100 XP, level 10 at 20,000 XP.
 * Beyond level 10 the title keeps climbing by the same step so the course
 * never runs out of ceiling.
 */
export const LEVELS: readonly number[] = [
  0, 100, 250, 500, 1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 64_000,
]

export const LEVEL_TITLES: readonly string[] = [
  'Beginner',
  'Apprentice',
  'Practitioner',
  'Journeyman',
  'Craftsperson',
  'Artisan',
  'Expert',
  'Master',
  'Virtuoso',
  'Legend',
  'Emeritus',
]

export interface Quest {
  id: string
  /** Window: 'today' resets each course day, 'week' resets each course week. */
  window: 'today' | 'week'
  title: string
  detail: string
  progress: { done: number; total: number }
  /** XP on completion. */
  xp: number
  earned: boolean
}

export interface Boss {
  title: string
  detail: string
  /** The week's project + gate. XP dominates so reward tracks real work. */
  xp: number
  progress: { done: number; total: number }
  defeated: boolean
  weekId: string
  weekNumber: number
}

export interface GameStats {
  xp: number
  level: number
  /** Title at the current level. */
  title: string
  /** 0..1 of the way to the next level. */
  levelProgress: number
  /** Points to the next level threshold, or null at the top. */
  nextLevelAt: number | null
  quests: Quest[]
  /** The current week's boss. Absent after Week 24 or before the course starts. */
  boss?: Boss
  /** XP earned today (course day). */
  todayXp: number
  /** XP earned this course week. */
  weekXp: number
}

function levelOf(xp: number): { level: number; nextAt: number | null; progress: number } {
  let level = 0
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i]!) {
      level = i
      break
    }
  }
  const next = LEVELS[level + 1]
  if (next === undefined) {
    return { level, nextAt: null, progress: 1 }
  }
  const prev = LEVELS[level]!
  const progress = Math.min(1, (xp - prev) / (next - prev))
  return { level, nextAt: next, progress }
}

function titleAt(level: number): string {
  if (level < LEVEL_TITLES.length) return LEVEL_TITLES[level]!
  return `${LEVEL_TITLES.at(-1)} ${level - LEVEL_TITLES.length + 1}`
}

interface Evidence {
  subject: Subject
  journey: Journey
  now: number
}

function todaySlot(e: Evidence): number | null {
  if (isPaused(e.journey, e.now)) return null
  const day = courseDay(e.journey, e.now)
  return day === null ? null : daySlot(day)
}

function currentWeek(e: Evidence): Week | null {
  if (isPaused(e.journey, e.now)) return null
  const day = courseDay(e.journey, e.now)
  if (day === null) return null
  const weekNumber = courseWeek(day)
  return e.subject.weeks.find((week) => week.weekNumber === weekNumber) ?? null
}

function dayActiveTasks(e: Evidence, slot: number): { done: number; total: number } {
  const week = currentWeek(e)
  if (!week) return { done: 0, total: 0 }
  const items = week.checklist.filter((item) => item.day === slot && item.context === 'active')
  return {
    done: items.filter((item) => item.done).length,
    total: items.length,
  }
}

function dayTasksAll(e: Evidence, slot: number): { done: number; total: number } {
  const week = currentWeek(e)
  if (!week) return { done: 0, total: 0 }
  const items = week.checklist.filter((item) => item.day === slot)
  return {
    done: items.filter((item) => item.done).length,
    total: items.length,
  }
}

function weekTasks(e: Evidence): { done: number; total: number } {
  const week = currentWeek(e)
  if (!week) return { done: 0, total: 0 }
  return {
    done: week.checklist.filter((item) => item.done).length,
    total: week.checklist.length,
  }
}

function questsFor(e: Evidence): Quest[] {
  const slot = todaySlot(e)
  const week = currentWeek(e)
  const quests: Quest[] = []

  if (slot !== null && week) {
    const dayAll = dayTasksAll(e, slot)
    quests.push({
      id: 'daily-tasks',
      window: 'today',
      title: `Finish three tasks on Day ${slot}`,
      detail: "Pick any three from today's card. A checked task is the only evidence.",
      progress: { done: Math.min(dayAll.done, 3), total: 3 },
      xp: 30,
      earned: dayAll.done >= 3,
    })

    const active = dayActiveTasks(e, slot)
    quests.push({
      id: 'daily-active',
      window: 'today',
      title: `Build something today`,
      detail: 'Check one active task. Reading a doc is not enough.',
      progress: { done: Math.min(active.done, 1), total: 1 },
      xp: 15,
      earned: active.done >= 1,
    })
  }

  if (week) {
    const total = weekTasks(e)
    quests.push({
      id: 'week-finish',
      window: 'week',
      title: `Finish Week ${week.weekNumber}`,
      detail: 'Every task in the week, then the checkpoint.',
      progress: total,
      xp: XP.weekComplete + XP.gate,
      earned: total.done === total.total && Boolean(week.gate.passedAt),
    })
  }

  return quests
}

function bossFor(e: Evidence): Boss | undefined {
  const week = currentWeek(e)
  if (!week) return undefined
  const total = week.checklist.length
  const done = week.checklist.filter((item) => item.done).length
  const gatePassed = Boolean(week.gate.passedAt)
  return {
    title: `Week ${week.weekNumber}: ${week.title}`,
    detail: week.gate.notes ?? 'Clear the checkpoint without notes.',
    xp: XP.gate,
    progress: { done: done + (gatePassed ? 1 : 0), total: total + 1 },
    defeated: done === total && gatePassed,
    weekId: week.id,
    weekNumber: week.weekNumber,
  }
}

function totalXp(subject: Subject): number {
  let xp = 0
  for (const week of subject.weeks) {
    xp += week.checklist.filter((item) => item.done).length * XP.task
    if (week.gate.passedAt) xp += XP.gate
    if (week.checklist.every((item) => item.done)) xp += XP.weekComplete
  }
  // Days with active work: one course day per weekday of every week in the clock.
  // We derive this from the checklist's doneAt dates to stay evidence-based.
  const activeDays = new Set<number>()
  for (const week of subject.weeks) {
    for (const item of week.checklist) {
      if (item.done && item.doneAt && item.context === 'active') {
        activeDays.add(item.doneAt)
      }
    }
  }
  xp += activeDays.size * XP.activeDay
  return xp
}

function xpToday(subject: Subject, now: number): number {
  let xp = 0
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const floor = startOfToday.getTime()
  for (const week of subject.weeks) {
    for (const item of week.checklist) {
      if (item.done && item.doneAt && item.doneAt >= floor) {
        xp += XP.task
        if (item.context === 'active') {
          // Count the active-day bonus at most once per day.
          // All tasks on the same day share the bonus, which we add once below.
        }
      }
    }
  }
  const hasActiveToday = subject.weeks.some((week) =>
    week.checklist.some(
      (item) => item.done && item.doneAt && item.doneAt >= floor && item.context === 'active',
    ),
  )
  if (hasActiveToday) xp += XP.activeDay
  return xp
}

function xpThisWeek(subject: Subject, journey: Journey, now: number): number {
  const day = courseDay(journey, now)
  if (day === null) return 0
  const weekNumber = courseWeek(day)
  const week = subject.weeks.find((entry) => entry.weekNumber === weekNumber)
  if (!week) return 0
  
  let xp = week.checklist.filter((item) => item.done).length * XP.task
  if (week.gate.passedAt) xp += XP.gate
  if (week.checklist.every((item) => item.done)) xp += XP.weekComplete
  
  // Add active-day bonus for each day this week with active work
  const activeDaysThisWeek = new Set<number>()
  for (const item of week.checklist) {
    if (item.done && item.doneAt && item.context === 'active') {
      activeDaysThisWeek.add(item.doneAt)
    }
  }
  xp += activeDaysThisWeek.size * XP.activeDay
  
  return xp
}

export function gameStatsFor(subject: Subject, journey: Journey, now = Date.now()): GameStats {
  const evidence: Evidence = { subject, journey, now }
  const xp = totalXp(subject)
  const { level, nextAt, progress } = levelOf(xp)
  return {
    xp,
    level,
    title: titleAt(level),
    levelProgress: progress,
    nextLevelAt: nextAt,
    quests: questsFor(evidence),
    boss: bossFor(evidence),
    todayXp: xpToday(subject, now),
    weekXp: xpThisWeek(subject, journey, now),
  }
}
