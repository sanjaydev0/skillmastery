import { createStore, del, get, set } from 'idb-keyval'
import type { AppData, Theme } from '../types/schema'
import { appDataSchema, migrateAppData } from './validation'

const DB_STORE = createStore('masteryharness', 'state')
const DATA_KEY = 'app-data-v1'
export const LOCAL_DATA_KEY = 'mh:data'
export const LOCAL_THEME_KEY = 'mh:theme'

export interface LoadResult {
  data: AppData | null
  source: 'indexeddb' | 'localstorage' | 'seed'
  issue?: 'corrupt' | 'empty'
}

function parseCandidate(raw: string | null | undefined): AppData | null {
  if (!raw) return null
  try {
    const parsed = appDataSchema.parse(JSON.parse(raw))
    return migrateAppData(parsed as AppData)
  } catch {
    return null
  }
}

function quarantine(raw: string | null | undefined): void {
  if (!raw) return
  try {
    localStorage.setItem(`mh:corrupt:${Date.now()}`, raw.slice(0, 2_000_000))
  } catch {
    // Storage is full or unavailable; the original copy stays where it was.
  }
}

export async function loadPersisted(): Promise<LoadResult> {
  let idbRaw: string | null = null
  try {
    idbRaw = (await get<string>(DATA_KEY, DB_STORE)) ?? null
  } catch {
    idbRaw = null
  }

  let lsRaw: string | null = null
  try {
    lsRaw = localStorage.getItem(LOCAL_DATA_KEY)
  } catch {
    lsRaw = null
  }

  const idbData = parseCandidate(idbRaw)
  const lsData = parseCandidate(lsRaw)

  if (idbData && lsData) {
    return {
      data: lsData.updatedAt > idbData.updatedAt ? lsData : idbData,
      source: lsData.updatedAt > idbData.updatedAt ? 'localstorage' : 'indexeddb',
    }
  }
  if (idbData) return { data: idbData, source: 'indexeddb' }
  if (lsData) return { data: lsData, source: 'localstorage' }

  if (idbRaw || lsRaw) {
    quarantine(idbRaw ?? lsRaw)
    return { data: null, source: 'seed', issue: 'corrupt' }
  }
  return { data: null, source: 'seed', issue: 'empty' }
}

export async function savePersisted(data: AppData): Promise<'indexeddb' | 'localstorage'> {
  const serialised = JSON.stringify(data)
  try {
    await set(DATA_KEY, serialised, DB_STORE)
    mirror(serialised)
    return 'indexeddb'
  } catch {
    // Fall back to localStorage so a save is never silently lost.
    localStorage.setItem(LOCAL_DATA_KEY, serialised)
    return 'localstorage'
  }
}

function mirror(serialised: string): void {
  try {
    if (serialised.length < 4_500_000) localStorage.setItem(LOCAL_DATA_KEY, serialised)
  } catch {
    // Quota exceeded: IndexedDB remains the source of truth.
  }
}

/** Synchronous last-chance mirror for pagehide/visibilitychange. */
export function mirrorNow(data: AppData): void {
  mirror(JSON.stringify(data))
}

export async function clearPersisted(): Promise<void> {
  try {
    await del(DATA_KEY, DB_STORE)
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(LOCAL_DATA_KEY)
  } catch {
    // ignore
  }
}

export function persistTheme(theme: Theme, resolvedDark: boolean): void {
  try {
    if (theme === 'system') localStorage.removeItem(LOCAL_THEME_KEY)
    else localStorage.setItem(LOCAL_THEME_KEY, resolvedDark ? 'dark' : 'light')
  } catch {
    // ignore
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    // ignore
  }
  return false
}

export interface StorageEstimate {
  usage: number
  quota: number
  persisted: boolean
}

export async function storageEstimate(): Promise<StorageEstimate> {
  let usage = 0
  let quota = 0
  let persisted = false
  try {
    const estimate = await navigator.storage?.estimate?.()
    usage = estimate?.usage ?? 0
    quota = estimate?.quota ?? 0
    persisted = (await navigator.storage?.persisted?.()) ?? false
  } catch {
    // ignore
  }
  return { usage, quota, persisted }
}
