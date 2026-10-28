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
  const { planner: _planner, promptOverrides: _prompts, ...rest } = seed
  return {
    ...rest,
    schemaVersion: 1,
    subjects: rest.subjects.map(stripEstimates),
  } as MigratableAppData
}

function v2Payload(): MigratableAppData {
  const seed = createSeedData()
  const { promptOverrides: _prompts, ...rest } = seed
  return {
    ...rest,
    schemaVersion: 2,
  } as MigratableAppData
}

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
    expect(parsed.data.planner.weekdayActiveMinutes).toBe(90)
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
