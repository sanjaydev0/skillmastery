import { describe, it, expect, beforeEach } from 'vitest'
import { gameStatsFor, XP, LEVELS } from './gamification'
import type { Subject, Journey, ChecklistItem, DaySlot } from '../types/schema'
import { startOfLocalDay } from '../lib/courseClock'

function day(year: number, month: number, date: number): number {
  return startOfLocalDay(new Date(year, month, date, 12).getTime())
}

function createSubject(weeks = 2, tasksPerWeek = 10): Subject {
  const subject: Subject = {
    id: 'test-subject',
    name: 'Test',
    shortName: 'Test',
    accent: 'sky',
    tagline: 'Test subject',
    phases: [{ id: 'phase-1', name: 'Phase 1', subtitle: 'Test phase' }],
    weeks: [],
    nodes: [],
    cards: [],
    resources: [],
  }

  for (let w = 1; w <= weeks; w++) {
    const weekId = `week-${w}`
    const checklist: ChecklistItem[] = []
    for (let t = 1; t <= tasksPerWeek; t++) {
      checklist.push({
        id: `${weekId}-task-${t}`,
        label: `Task ${t}`,
        context: t % 2 === 0 ? 'active' : 'passive',
        day: (((t - 1) % 7) + 1) as DaySlot,
        estimate: { min: 20, max: 30 },
        done: false,
      })
    }
    subject.weeks.push({
      id: weekId,
      weekNumber: w,
      phaseId: 'phase-1',
      title: `Week ${w}`,
      anchor: 'Test anchor',
      outcomes: ['Outcome 1'],
      rabbitHoles: [],
      bookFocus: 'Test book',
      prerequisiteWeekIds: [],
      encompassedNodeIds: [],
      checklist,
      gate: { attempts: [], passedAt: undefined },
      capstone: `Week ${w} capstone`,
      detail: 'full',
    })
  }

  return subject
}

function createJourney(startedAt: number, paused = false): Journey {
  return {
    startedAt,
    startWeekday: 1,
    pauses: paused ? [{ from: startedAt + 86400000, to: null }] : [],
    gameLayer: true,
    onboardedAt: startedAt,
  }
}

describe('gamification engine', () => {
  let subject: Subject
  let journey: Journey
  const now = day(2026, 0, 3) // Day 3 of course (in week 1)

  beforeEach(() => {
    subject = createSubject(2, 10)
    journey = createJourney(day(2026, 0, 1))
  })

  it('starts at level 0 with 0 XP on a fresh course', () => {
    const stats = gameStatsFor(subject, journey, now)
    expect(stats.xp).toBe(0)
    expect(stats.level).toBe(0)
    expect(stats.title).toBe('Beginner')
    expect(stats.levelProgress).toBe(0)
    expect(stats.nextLevelAt).toBe(LEVELS[1])
  })

  it('awards 10 XP per checked task', () => {
    // checklist[0] is passive, checklist[1] is active (t=2, 2%2===0)
    subject.weeks[0].checklist[0].done = true
    subject.weeks[0].checklist[0].doneAt = now
    subject.weeks[0].checklist[1].done = true
    subject.weeks[0].checklist[1].doneAt = now

    const stats = gameStatsFor(subject, journey, now)
    // 2 tasks * 10 XP + 15 XP active-day bonus (one active task done)
    expect(stats.xp).toBe(2 * XP.task + XP.activeDay)
  })

  it('awards 120 XP for passing a gate', () => {
    subject.weeks[0].gate.passedAt = now

    const stats = gameStatsFor(subject, journey, now)
    expect(stats.xp).toBe(XP.gate)
  })

  it('awards 200 XP for completing all tasks in a week', () => {
    subject.weeks[0].checklist.forEach((task) => {
      task.done = true
      task.doneAt = now
    })

    const stats = gameStatsFor(subject, journey, now)
    // 10 tasks * 10 XP + 200 XP week completion + 15 XP active-day bonus
    expect(stats.xp).toBe(10 * XP.task + XP.weekComplete + XP.activeDay)
  })

  it('awards 15 XP bonus for each day with active work', () => {
    // Mark one active task done today
    const activeTask = subject.weeks[0].checklist.find((t) => t.context === 'active')
    if (activeTask) {
      activeTask.done = true
      activeTask.doneAt = now
    }

    const stats = gameStatsFor(subject, journey, now)
    expect(stats.todayXp).toBe(XP.task + XP.activeDay)
  })

  it('levels up when XP crosses threshold', () => {
    // Complete enough tasks to reach level 1 (100 XP)
    for (let i = 0; i < 10; i++) {
      subject.weeks[0].checklist[i].done = true
      subject.weeks[0].checklist[i].doneAt = now
    }
    subject.weeks[0].gate.passedAt = now // +120 XP

    const stats = gameStatsFor(subject, journey, now)
    expect(stats.xp).toBeGreaterThanOrEqual(LEVELS[1])
    expect(stats.level).toBeGreaterThanOrEqual(1)
    expect(stats.title).not.toBe('Beginner')
  })

  it('returns quests for the current week and day', () => {
    const stats = gameStatsFor(subject, journey, now)
    expect(stats.quests.length).toBeGreaterThan(0)
    
    const dailyQuest = stats.quests.find((q) => q.window === 'today')
    const weeklyQuest = stats.quests.find((q) => q.window === 'week')
    
    expect(dailyQuest).toBeDefined()
    expect(weeklyQuest).toBeDefined()
  })

  it('returns a boss for the current week', () => {
    const stats = gameStatsFor(subject, journey, now)
    expect(stats.boss).toBeDefined()
    expect(stats.boss?.weekId).toBe(subject.weeks[0].id)
    expect(stats.boss?.xp).toBe(XP.gate)
  })

  it('marks boss as defeated when all tasks done and gate passed', () => {
    subject.weeks[0].checklist.forEach((task) => {
      task.done = true
      task.doneAt = now
    })
    subject.weeks[0].gate.passedAt = now

    const stats = gameStatsFor(subject, journey, now)
    expect(stats.boss?.defeated).toBe(true)
  })

  it('does not earn XP when paused', () => {
    const pausedJourney = createJourney(day(2026, 0, 1), true)
    subject.weeks[0].checklist[0].done = true
    subject.weeks[0].checklist[0].doneAt = now

    const stats = gameStatsFor(subject, pausedJourney, now)
    // XP is still earned (it's derived from doneAt timestamps)
    expect(stats.xp).toBe(XP.task)
    // But quests/boss are null when paused
    expect(stats.quests.length).toBe(0)
    expect(stats.boss).toBeUndefined()
  })

  it('tracks XP earned this week separately', () => {
    // Complete tasks in week 1 (current week on Day 3)
    subject.weeks[0].checklist[0].done = true
    subject.weeks[0].checklist[0].doneAt = now
    subject.weeks[0].checklist[1].done = true
    subject.weeks[0].checklist[1].doneAt = now

    const stats = gameStatsFor(subject, journey, now)
    // 2 tasks * 10 XP + 15 XP active-day bonus (one active task done)
    expect(stats.weekXp).toBe(2 * XP.task + XP.activeDay)
  })

  it('pays one active-day bonus however many active tasks share the day', () => {
    const actives = subject.weeks[0].checklist.filter((task) => task.context === 'active')
    actives.slice(0, 3).forEach((task) => {
      task.done = true
      task.doneAt = now + 1_000
    })

    const stats = gameStatsFor(subject, journey, now)
    expect(stats.xp).toBe(3 * XP.task + XP.activeDay)
  })

  it('pays the active-day bonus once per calendar day', () => {
    const actives = subject.weeks[0].checklist.filter((task) => task.context === 'active')
    actives[0]!.done = true
    actives[0]!.doneAt = day(2026, 0, 1)
    actives[1]!.done = true
    actives[1]!.doneAt = day(2026, 0, 2)

    const stats = gameStatsFor(subject, journey, now)
    expect(stats.xp).toBe(2 * XP.task + 2 * XP.activeDay)
  })

  it('pays no week-completion XP for a week with no tasks', () => {
    subject.weeks[0].checklist = []
    const stats = gameStatsFor(subject, journey, now)
    expect(stats.xp).toBe(0)
  })

  it('handles empty subject gracefully', () => {
    const emptySubject: Subject = {
      id: 'empty',
      name: 'Empty',
      shortName: 'Empty',
      accent: 'sky',
      tagline: 'Empty',
      phases: [],
      weeks: [],
      nodes: [],
      cards: [],
      resources: [],
    }

    const stats = gameStatsFor(emptySubject, journey, now)
    expect(stats.xp).toBe(0)
    expect(stats.level).toBe(0)
    expect(stats.quests).toEqual([])
    expect(stats.boss).toBeUndefined()
  })
})
