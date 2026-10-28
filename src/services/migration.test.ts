import { describe, expect, it } from 'vitest'
import { createSeedData } from '../data/seedData'
import type { AppData, ChecklistItem, Subject, Week } from '../types/schema'
import { DEFAULT_PLANNER, SCHEMA_VERSION } from '../types/schema'
import type { MigratableAppData } from './validation'
import { appDataSchema, migrateAppData, parseBackupJson } from './validation'

function stripEstimates(subject: Subject): Subject {
  return {
    ...subject,
    weeks: subject.weeks.map((week) => ({
      ...week,
      checklist: week.checklist.map((item) => {
        const legacy: ChecklistItem = { ...item }
        delete legacy.estimate
        return legacy
      }),
    })),
  }
}

function v1Payload(): MigratableAppData {
  const seed = createSeedData()
  const {
    planner: _planner,
    promptOverrides: _prompts,
    journey: _journey,
    dayPlans: _dayPlans,
    trash: _trash,
    ...rest
  } = seed
  return {
    ...rest,
    schemaVersion: 1,
    subjects: rest.subjects.map(stripEstimates),
  } as MigratableAppData
}

function v2Payload(): MigratableAppData {
  const seed = createSeedData()
  const { promptOverrides: _prompts, journey: _journey, dayPlans: _dayPlans, trash: _trash, ...rest } = seed
  return {
    ...rest,
    schemaVersion: 2,
  } as MigratableAppData
}

function v3Payload(): MigratableAppData {
  const seed = createSeedData()
  const { journey: _journey, dayPlans: _dayPlans, trash: _trash, ...rest } = seed
  return {
    ...rest,
    schemaVersion: 3,
    planner: {
      weekdayActiveMinutes: 120,
      weekdayPassiveMinutes: 30,
      weekendActiveMinutes: 60,
      weekendPassiveMinutes: 15,
      studyDays: [1, 2, 3, 4, 5, 6],
      bufferDay: 0,
      sessionMinutes: 30,
    },
  } as MigratableAppData
}

describe('schema v4 migration', () => {
  it('folds per-day capacity into a weekly total', () => {
    const migrated = migrateAppData(v3Payload())
    // 120×5 + 60×2 = 720 active minutes; 30×5 + 15×2 = 180 passive.
    expect(migrated.planner.weeklyActiveMinutes).toBe(720)
    expect(migrated.planner.weeklyPassiveMinutes).toBe(180)
    expect(migrated.planner.sessionMinutes).toBe(30)
    expect(migrated.planner.bufferDay).toBe(0)
    expect('weekdayActiveMinutes' in migrated.planner).toBe(false)
  })

  it('adds an unstarted journey, empty day plans and an empty trash', () => {
    const migrated = migrateAppData(v3Payload())
    expect(migrated.journey).toEqual({
      startedAt: null,
      startWeekday: 1,
      pauses: [],
      gameLayer: true,
      onboardedAt: null,
    })
    expect(migrated.dayPlans).toEqual({})
    expect(migrated.trash).toEqual([])
  })

  it('keeps day cards that a v3 payload already carried', () => {
    const payload = v3Payload()
    payload.dayPlans = {
      'flutter-w1': [
        {
          day: 2,
          title: 'Second day',
          summary: 'Words.',
          resources: [],
          tasks: ['Do the thing'],
          direction: 'Not that.',
          designNote: 'Hierarchy.',
          estMinutes: 45,
          origin: 'ai',
        },
      ],
    }
    const migrated = migrateAppData(payload)
    expect(migrated.dayPlans['flutter-w1']).toHaveLength(1)
  })

  it('drops a buffer day that is also a study day', () => {
    const payload = v3Payload()
    payload.planner = {
      ...payload.planner,
      studyDays: [0, 1, 2, 3, 4, 5, 6],
      bufferDay: 0,
    }
    const migrated = migrateAppData(payload)
    expect(migrated.planner.bufferDay).toBeNull()
    expect(migrated.planner.studyDays).toHaveLength(7)
  })
})

function v4Payload(): MigratableAppData {
  const seed = createSeedData()
  // A real v4 payload stored Sunday as weekday 0, so the seventh slot was 0.
  const subjects = seed.subjects.map((subject) => ({
    ...subject,
    weeks: subject.weeks.map((week) => ({
      ...week,
      checklist: week.checklist.map((item) => (item.day === 7 ? { ...item, day: 0 } : item)),
    })),
  })) as AppData['subjects']
  return { ...seed, schemaVersion: 4, subjects } as MigratableAppData
}

describe('schema v5 day slots', () => {
  it('maps a stored weekday 0 onto slot 7', () => {
    const migrated = migrateAppData(v4Payload())
    const week = migrated.subjects[0]!.weeks[0] as Week
    expect(week.checklist.map((item) => item.day)).not.toContain(0)
    expect(week.checklist.some((item) => item.day === 7)).toBe(true)
    expect(week.checklist.map((item) => item.day)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 7, 7])
  })

  it('fills a missing day for an older payload without inventing one for v5', () => {
    const payload = v4Payload()
    const week = payload.subjects[0]!.weeks[0]!
    week.checklist[0] = { ...week.checklist[0]!, day: undefined }
    const migrated = migrateAppData(payload)
    expect(migrated.subjects[0]!.weeks[0]!.checklist[0]!.day).toBe(1)

    const current = migrateAppData(v4Payload())
    current.schemaVersion = SCHEMA_VERSION
    current.subjects[0]!.weeks[0]!.checklist[0] = {
      ...current.subjects[0]!.weeks[0]!.checklist[0]!,
      day: undefined,
    }
    const again = migrateAppData(current)
    expect(again.subjects[0]!.weeks[0]!.checklist[0]!.day).toBeUndefined()
    expect(again.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('still imports a v4 backup envelope', () => {
    const raw = JSON.stringify({
      app: 'skillmastery',
      exportedAt: '2026-06-01T00:00:00.000Z',
      data: v4Payload(),
    })
    const parsed = parseBackupJson(raw)
    expect(parsed.data.schemaVersion).toBe(SCHEMA_VERSION)
    expect(parsed.data.subjects[0]!.weeks[0]!.checklist.some((item) => item.day === 7)).toBe(true)
  })
})

describe('schema migration', () => {
  it('adds planner defaults without touching existing preferences', () => {
    const legacy = v1Payload()
    const migrated = migrateAppData(legacy)
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
    expect(migrated.planner).toEqual(DEFAULT_PLANNER)
    expect(migrated.prefs).toEqual(legacy.prefs)
  })

  it('fills an estimate for every task that only had minutes', () => {
    const migrated = migrateAppData(v1Payload())
    const week = migrated.subjects[0]!.weeks[0] as Week
    for (const item of week.checklist) {
      expect(item.estimate).toBeDefined()
      expect(item.estimate!.max).toBeGreaterThanOrEqual(item.estimate!.min)
    }
    // 60 minutes was the most common v1 task length.
    const sixty = week.checklist.find((item) => item.minutes === 60)
    expect(sixty?.estimate).toEqual({ min: 60, max: 75 })
  })

  it('keeps an already-migrated payload and its explicit estimates', () => {
    const current = createSeedData() as AppData
    const explicit = current.subjects[0]!.weeks[0]!.checklist[0]!
    explicit.estimate = { min: 5, max: 9 }
    const migrated = migrateAppData(current)
    expect(migrated.subjects[0]!.weeks[0]!.checklist[0]!.estimate).toEqual({ min: 5, max: 9 })
    expect(migrated.planner).toEqual(current.planner)
  })

  it('accepts a v1 backup envelope and migrates it on import', () => {
    const payload = v1Payload()
    const raw = JSON.stringify({ app: 'skillmastery', exportedAt: '2026-01-01T00:00:00.000Z', data: payload })
    const parsed = parseBackupJson(raw)
    expect(parsed.exportedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(parsed.data.schemaVersion).toBe(SCHEMA_VERSION)
    expect(parsed.data.planner.weeklyActiveMinutes).toBe(720)
    expect(parsed.data.subjects[0]!.weeks[0]!.checklist[0]!.estimate).toBeDefined()
  })

  it('defaults a missing schema version to v1 and migrates it', () => {
    const payload = v1Payload() as Record<string, unknown>
    delete payload.schemaVersion
    const parsed = appDataSchema.parse(payload) as AppData
    expect(parsed.schemaVersion).toBe(1)
    expect(migrateAppData(parsed).schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('adds empty prompt overrides to a v2 payload', () => {
    const migrated = migrateAppData(v2Payload())
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
    expect(migrated.promptOverrides).toEqual({})
    expect(migrated.planner).toEqual(DEFAULT_PLANNER)
  })

  it('keeps edited prompt skills through a current-schema pass', () => {
    const current = createSeedData() as AppData
    current.promptOverrides = { 'socratic-tutor': 'My edited Socratic skill' }
    const migrated = migrateAppData(current)
    expect(migrated.promptOverrides['socratic-tutor']).toBe('My edited Socratic skill')
  })

  it('drops a blank prompt override instead of rejecting the backup', () => {
    const payload = v2Payload()
    payload.schemaVersion = SCHEMA_VERSION
    payload.promptOverrides = { 'socratic-tutor': '   ', 'anki-generator': 'Keep this skill' }
    const parsed = appDataSchema.parse(payload) as AppData
    const migrated = migrateAppData(parsed)
    expect(migrated.promptOverrides).toEqual({ 'anki-generator': 'Keep this skill' })
  })

  it('imports a v2 envelope with prompt overrides filled in', () => {
    const raw = JSON.stringify({ app: 'skillmastery', exportedAt: '2026-02-01T00:00:00.000Z', data: v2Payload() })
    const parsed = parseBackupJson(raw)
    expect(parsed.data.schemaVersion).toBe(SCHEMA_VERSION)
    expect(parsed.data.promptOverrides).toEqual({})
  })
})
