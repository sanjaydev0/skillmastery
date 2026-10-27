import { beforeEach, describe, expect, it } from 'vitest'
import { createStore, get, set } from 'idb-keyval'
import { createSeedData } from '../data/seedData'
import type { AppData } from '../types/schema'
import {
  LOCAL_DATA_KEY,
  LOCAL_THEME_KEY,
  clearPersisted,
  loadPersisted,
  readThemePreference,
} from './storage'

const DATA_KEY = 'app-data-v1'
const NEW_STORE = createStore('skillmastery', 'state')
const LEGACY_STORE = createStore('masteryharness', 'state')

function fixture(name: string, updatedAt: number): AppData {
  const data = createSeedData()
  data.subjects[0]!.name = name
  data.updatedAt = updatedAt
  return data
}

beforeEach(async () => {
  await clearPersisted()
  localStorage.clear()
})

describe('SkillMastery storage namespace', () => {
  it('migrates a legacy IndexedDB copy into the canonical namespace', async () => {
    const legacy = fixture('Legacy Flutter', 101)
    await set(DATA_KEY, JSON.stringify(legacy), LEGACY_STORE)

    const result = await loadPersisted()
    expect(result.data?.subjects[0]?.name).toBe('Legacy Flutter')
    expect(result.source).toBe('indexeddb')
    expect(JSON.parse((await get(DATA_KEY, NEW_STORE)) as string).subjects[0].name).toBe('Legacy Flutter')
    expect(localStorage.getItem(LOCAL_DATA_KEY)).not.toBeNull()
    expect(await get(DATA_KEY, LEGACY_STORE)).toBeUndefined()
  })

  it('migrates the legacy localStorage data key', async () => {
    localStorage.setItem('mh:data', JSON.stringify(fixture('Legacy Local', 102)))
    const result = await loadPersisted()
    expect(result.data?.subjects[0]?.name).toBe('Legacy Local')
    expect(result.source).toBe('localstorage')
    expect(localStorage.getItem('mh:data')).toBeNull()
    expect(JSON.parse(localStorage.getItem(LOCAL_DATA_KEY) as string).subjects[0].name).toBe('Legacy Local')
  })

  it('chooses the newest valid copy across both namespaces', async () => {
    localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(fixture('Canonical', 200)))
    await set(DATA_KEY, JSON.stringify(fixture('Legacy Newer', 300)), LEGACY_STORE)

    const result = await loadPersisted()
    expect(result.data?.subjects[0]?.name).toBe('Legacy Newer')
    expect(JSON.parse((await get(DATA_KEY, NEW_STORE)) as string).subjects[0].name).toBe('Legacy Newer')
  })

  it('removes a stale legacy copy when the canonical copy is newer', async () => {
    localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(fixture('Canonical Newer', 400)))
    await set(DATA_KEY, JSON.stringify(fixture('Legacy Older', 100)), LEGACY_STORE)

    const result = await loadPersisted()
    expect(result.data?.subjects[0]?.name).toBe('Canonical Newer')
    expect(await get(DATA_KEY, LEGACY_STORE)).toBeUndefined()
    expect(localStorage.getItem('mh:data')).toBeNull()
  })

  it('quarantines a corrupt canonical copy instead of opening it', async () => {
    localStorage.setItem(LOCAL_DATA_KEY, '{not-json')
    const result = await loadPersisted()
    expect(result.issue).toBe('corrupt')
    expect(result.data).toBeNull()
    expect(Object.keys(localStorage).some((key) => key.startsWith('skillmastery:corrupt:'))).toBe(true)
  })

  it('migrates the legacy theme key without losing the preference', () => {
    localStorage.setItem('mh:theme', 'light')
    expect(readThemePreference()).toBe('light')
    expect(localStorage.getItem(LOCAL_THEME_KEY)).toBe('light')
    expect(localStorage.getItem('mh:theme')).toBeNull()
  })
})
