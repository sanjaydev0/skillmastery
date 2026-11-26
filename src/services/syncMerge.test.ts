import { describe, expect, it } from 'vitest'
import { createSeedData } from '../data/seedData'
import { mergeAppData } from './syncMerge'

function seed() {
  return createSeedData()
}

describe('cloud sync merge', () => {
  it('never un-earns a checked task and keeps the earliest check time', () => {
    const local = seed()
    const remote = seed()
    const week = local.subjects[0]!.weeks[0]!
    week.checklist[0] = { ...week.checklist[0]!, done: true, doneAt: 1000 }
    const remoteWeek = remote.subjects[0]!.weeks[0]!
    remoteWeek.checklist[0] = { ...remoteWeek.checklist[0]!, done: false, doneAt: undefined }

    const merged = mergeAppData(local, remote)
    const item = merged.subjects[0]!.weeks[0]!.checklist[0]!
    expect(item.done).toBe(true)
    expect(item.doneAt).toBe(1000)
  })

  it('keeps a passed checkpoint passed and takes the first pass time', () => {
    const local = seed()
    const remote = seed()
    const localWeek = local.subjects[0]!.weeks[0]!
    localWeek.gate = {
      ...localWeek.gate,
      checks: { explain: true, build: true, finish: true, debug: true },
      passedAt: 500,
    }
    const remoteWeek = remote.subjects[0]!.weeks[0]!
    remoteWeek.gate = { ...remoteWeek.gate, checks: undefined, passedAt: undefined }

    const merged = mergeAppData(local, remote)
    const gate = merged.subjects[0]!.weeks[0]!.gate
    expect(gate.checks?.debug).toBe(true)
    expect(gate.passedAt).toBe(500)
  })

  it('keeps the card with more reviews and the higher review steps', () => {
    const local = seed()
    const remote = seed()
    const card = {
      id: 'card-test',
      front: 'front',
      back: 'back',
      tags: ['bug'],
      source: 'mistake' as const,
      scheduleStep: 3,
      dueAt: 9000,
      lapses: 1,
      reviews: 4,
      createdAt: 100,
      updatedAt: 400,
    }
    local.subjects[0]!.cards = [card]
    remote.subjects[0]!.cards = [{ ...card, scheduleStep: 1, dueAt: 1000, reviews: 1, updatedAt: 300 }]

    const merged = mergeAppData(local, remote)
    const result = merged.subjects[0]!.cards.find((entry) => entry.id === 'card-test')!
    expect(result.reviews).toBe(4)
    expect(result.scheduleStep).toBe(3)
    expect(result.dueAt).toBe(9000)
  })

  it('does not resurrect a week that sits in the trash', () => {
    const local = seed()
    const remote = seed()
    const week = local.subjects[0]!.weeks[0]!
    local.subjects[0]!.weeks = local.subjects[0]!.weeks.filter((entry) => entry.id !== week.id)
    local.trash = [
      {
        id: 'trash-1',
        kind: 'week',
        deletedAt: 2000,
        label: week.title,
        subjectId: local.subjects[0]!.id,
        subjectName: local.subjects[0]!.name,
        payload: week,
        counts: {},
      },
    ]

    const merged = mergeAppData(local, remote)
    expect(merged.subjects[0]!.weeks.some((entry) => entry.id === week.id)).toBe(false)
  })

  it('keeps device-local planning, theme and prompt edits', () => {
    const local = seed()
    const remote = seed()
    local.planner.weeklyActiveMinutes = 600
    local.prefs.theme = 'light'
    local.promptOverrides['skill-x'] = 'local edit'
    remote.planner.weeklyActiveMinutes = 720
    remote.prefs.theme = 'dark'
    remote.promptOverrides['skill-x'] = 'remote edit'

    const merged = mergeAppData(local, remote)
    expect(merged.planner.weeklyActiveMinutes).toBe(600)
    expect(merged.prefs.theme).toBe('light')
    expect(merged.promptOverrides['skill-x']).toBe('local edit')
  })

  it('unions daily items and fills missing bug notes without overwriting today', () => {
    const local = seed()
    const remote = seed()
    local.dailyLog['2026-11-26'] = { items: ['a'] }
    remote.dailyLog['2026-11-26'] = { items: ['a', 'b'] }
    local.bugLog['2026-11-26'] = 'local fix'
    remote.bugLog['2026-11-26'] = 'remote fix'
    remote.bugLog['2026-11-25'] = 'older fix'

    const merged = mergeAppData(local, remote)
    expect(merged.dailyLog['2026-11-26']!.items.sort()).toEqual(['a', 'b'])
    expect(merged.bugLog['2026-11-26']).toBe('local fix')
    expect(merged.bugLog['2026-11-25']).toBe('older fix')
  })
})
