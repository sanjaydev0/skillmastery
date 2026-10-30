import { describe, expect, it } from 'vitest'
import type { ChecklistItem } from '../types/schema'
import { SEED_VERSION } from '../types/schema'
import { createSeedData } from '../data/seedData'
import { refreshSeedContent } from './seedUpgrade'

function legacyItem(weekId: string, index: number, day: number, done: boolean): ChecklistItem {
  return {
    id: `${weekId}-c${index + 1}`,
    label: `Old task ${index + 1}`,
    context: index < 3 ? 'passive' : 'active',
    day: day as ChecklistItem['day'],
    minutes: index < 3 ? 60 : 45,
    done,
  }
}

describe('seed content refresh', () => {
  it('replaces authored text while carrying checks and checkpoint history', () => {
    const data = createSeedData()
    data.seedVersion = 1
    const week = data.subjects[0]!.weeks[0]!
    const oldTitle = 'Dart types, sound null safety & memory models'
    week.title = oldTitle
    week.checklist = [
      legacyItem(week.id, 0, 1, true),
      legacyItem(week.id, 1, 2, false),
      legacyItem(week.id, 2, 3, true),
      legacyItem(week.id, 3, 4, true),
      legacyItem(week.id, 4, 5, false),
      legacyItem(week.id, 5, 6, false),
      legacyItem(week.id, 6, 0, false),
    ]
    week.gate = { attempts: [], notes: 'My own checkpoint wording', passedAt: 123 }
    week.checklist.push({
      id: 'user-added',
      label: 'A task I wrote myself',
      context: 'active',
      minutes: 20,
      done: true,
    })

    const { data: refreshed, changed } = refreshSeedContent(data)
    expect(changed).toBe(true)
    expect(refreshed.seedVersion).toBe(SEED_VERSION)
    const upgraded = refreshed.subjects[0]!.weeks[0]!
    expect(upgraded.title).not.toBe(oldTitle)
    expect(upgraded.title).toContain('first Dart program')
    expect(upgraded.gate.notes).toBe('My own checkpoint wording')
    expect(upgraded.gate.passedAt).toBe(123)
    expect(upgraded.checklist).toHaveLength(16)
    expect(upgraded.checklist.some((item) => /^fl-w1-c\d+$/.test(item.id))).toBe(false)
    expect(upgraded.checklist.find((item) => item.id === 'user-added')?.done).toBe(true)
    // Monday's passive read and Wednesday's passive read keep their checks.
    expect(upgraded.checklist.find((item) => item.id === `${week.id}-d1a`)?.done).toBe(true)
    expect(upgraded.checklist.find((item) => item.id === `${week.id}-d3a`)?.done).toBe(true)
    // Thursday's build was checked; the new passive sketch on that day was not.
    expect(upgraded.checklist.find((item) => item.id === `${week.id}-d4a`)?.done).toBe(false)
    expect(upgraded.checklist.find((item) => item.id === `${week.id}-d4b`)?.done).toBe(true)
  })

  it('adds new seed resources without losing reading status or user links', () => {
    const data = createSeedData()
    data.seedVersion = 2
    const subject = data.subjects[0]!
    const reading = subject.resources.find((resource) => resource.id === 'fl-doc-1a')!
    reading.status = 'done'
    subject.resources = subject.resources.filter((resource) => resource.id !== 'fl-doc-4c')
    subject.resources.push({
      id: 'user-resource',
      title: 'A link I added',
      url: 'https://example.com/notes',
      kind: 'article',
      tags: [],
      status: 'reading',
    })

    const { data: refreshed } = refreshSeedContent(data)
    const next = refreshed.subjects[0]!
    expect(next.resources.filter((resource) => resource.id === 'fl-doc-4c')).toHaveLength(1)
    expect(next.resources.find((resource) => resource.id === 'fl-doc-1a')?.status).toBe('done')
    expect(next.resources.find((resource) => resource.id === 'user-resource')?.status).toBe('reading')
  })

  it('keeps the journey, day cards, trash and weekly capacity through a refresh', () => {
    const data = createSeedData()
    data.seedVersion = 1
    data.journey = {
      startedAt: 1_700_000_000_000,
      startWeekday: 3,
      pauses: [{ from: 1_700_100_000_000, to: null }],
      gameLayer: false,
      onboardedAt: 1_700_000_100_000,
    }
    data.dayPlans = {
      'fl-w1': [
        {
          day: 1,
          title: 'My own day one',
          summary: 'A binding points at an object.',
          resources: [],
          tasks: ['Write three bindings'],
          direction: 'Name the type before the value.',
          designNote: 'One number owns the screen.',
          estMinutes: 45,
          origin: 'user',
        },
      ],
    }
    data.trash = [
      {
        id: 'trash-1',
        kind: 'week',
        deletedAt: 1_700_200_000_000,
        label: 'Week 9: Routes',
        subjectId: 'flutter',
        subjectName: 'Flutter',
        payload: data.subjects[0]!.weeks[8]!,
        counts: { nodes: 3, cards: 5, days: 0 },
      },
    ]
    data.planner = {
      weeklyActiveMinutes: 300,
      weeklyPassiveMinutes: 240,
      studyDays: [1, 2, 3, 4, 5],
      bufferDay: 6,
      sessionMinutes: 30,
    }

    const { data: refreshed } = refreshSeedContent(data)
    expect(refreshed.seedVersion).toBe(SEED_VERSION)
    expect(refreshed.journey).toEqual(data.journey)
    expect(refreshed.trash).toEqual(data.trash)
    expect(refreshed.planner).toEqual(data.planner)
    // The learner's own card wins on day 1, and the six authored cards arrive.
    expect(refreshed.dayPlans['fl-w1']).toHaveLength(7)
    expect(refreshed.dayPlans['fl-w1']![0]!.title).toBe('My own day one')
    expect(refreshed.dayPlans['fl-w1']![0]!.origin).toBe('user')
    expect(refreshed.dayPlans['fl-w1']!.slice(1).every((plan) => plan.origin === 'authored')).toBe(true)
  })

  it('replaces a stale authored card but keeps a generated one', () => {
    const data = createSeedData()
    data.seedVersion = 1
    const freshWeekOne = createSeedData().dayPlans['fl-w1']!
    data.dayPlans = {
      'fl-w1': [
        { ...freshWeekOne[0]!, title: 'Old authored title' },
        { ...freshWeekOne[1]!, origin: 'ai', title: 'Generated day two' },
      ],
    }
    const { data: refreshed } = refreshSeedContent(data)
    const cards = refreshed.dayPlans['fl-w1']!
    expect(cards).toHaveLength(7)
    expect(cards[0]!.title).toBe(freshWeekOne[0]!.title)
    expect(cards[1]!.title).toBe('Generated day two')
    expect(cards[1]!.origin).toBe('ai')
  })

  it('is a no-op once the seed version is current', () => {
    const data = createSeedData()
    const { data: same, changed } = refreshSeedContent(data)
    expect(changed).toBe(false)
    expect(same).toBe(data)
  })
})
