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

  it('is a no-op once the seed version is current', () => {
    const data = createSeedData()
    const { data: same, changed } = refreshSeedContent(data)
    expect(changed).toBe(false)
    expect(same).toBe(data)
  })
})
