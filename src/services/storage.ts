import { createStore, del, get, set } from 'idb-keyval'
import type { AppData, Theme } from '../types/schema'
import { SCHEMA_VERSION } from '../types/schema'
import { appDataSchema, migrateAppData } from './validation'

const DB_STORE = createStore('skillmastery', 'state')
const LEGACY_DB_STORE = createStore('masteryharness', 'state')
const DATA_KEY = 'app-data-v1'
export const LOCAL_DATA_KEY = 'skillmastery:data'
export const LOCAL_THEME_KEY = 'skillmastery:theme'
const LEGACY_LOCAL_DATA_KEY = 'mh:data'
const LEGACY_LOCAL_THEME_KEY = 'mh:theme'
const QUARANTINE_PREFIX = 'skillmastery:corrupt:'
/** Kept until the next successful manual export, so a bad migration is recoverable. */
export const MIGRATION_BACKUP_KEY = 'skillmastery:pre-migration-backup'
export const MIGRATION_BACKUP_META_KEY = 'skillmastery:pre-migration-meta'
/**
 * localStorage is physically capped by the browser (usually 5–10 MB per origin),
 * so the mirror never writes more than this even if the stored threshold is larger.
 */
export const LOCAL_MIRROR_CAP_MB = 5
/** A fixed 4 MB guard: the web-standard budget this app plans to stay inside. */
export const DEFAULT_STORAGE_GUARD_MB = 4

export interface LoadResult {
  data: AppData | null
  source: 'indexeddb' | 'localstorage' | 'seed'
  issue?: 'corrupt' | 'empty'
}

interface StoredCandidate {
  raw: string | null
  source: 'indexeddb' | 'localstorage'
  legacy: boolean
}

interface ValidCandidate extends StoredCandidate {
  data: AppData
  /** Version as stored, before migration. */
  version: number
}

function parseCandidate(raw: string | null | undefined): { data: AppData; version: number } | null {
  if (!raw) return null
  try {
    const parsed = appDataSchema.parse(JSON.parse(raw)) as AppData
    const version = parsed.schemaVersion
    return { data: migrateAppData(parsed), version }
  } catch {
    return null
  }
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

async function readIndexed(store: ReturnType<typeof createStore>): Promise<string | null> {
  try {
    return (await get<string>(DATA_KEY, store)) ?? null
  } catch {
    return null
  }
}

function quarantine(raw: string | null | undefined): void {
  if (!raw) return
  try {
    localStorage.setItem(`${QUARANTINE_PREFIX}${Date.now()}`, raw.slice(0, 2_000_000))
  } catch {
    // Storage is full or unavailable; the original copy stays where it was.
  }
}

/**
 * A migration rewrites every checklist item, so keep the exact pre-upgrade
 * payload. The mirror can hold ~4.5 MB; if the raw copy is larger than that,
 * skip the backup rather than silently truncating it into something that looks
 * valid but is not.
 */
function backupBeforeMigration(raw: string | null | undefined, fromVersion: number): void {
  if (!raw) return
  if (raw.length > 4_500_000) return
  try {
    localStorage.setItem(MIGRATION_BACKUP_KEY, raw)
    localStorage.setItem(
      MIGRATION_BACKUP_META_KEY,
      JSON.stringify({ fromVersion, toVersion: SCHEMA_VERSION, at: Date.now(), bytes: raw.length }),
    )
  } catch {
    // Quota exceeded: the migration is still safe because it is additive.
  }
}

async function removeLegacyCopies(): Promise<void> {
  try {
    await del(DATA_KEY, LEGACY_DB_STORE)
  } catch {
    // A stale legacy copy is harmless: the canonical copy is newer.
  }
  try {
    localStorage.removeItem(LEGACY_LOCAL_DATA_KEY)
  } catch {
    // ignore
  }
}

/**
 * Move a copy found under the old MasteryHarness database/key into the
 * SkillMastery namespace. The legacy copy is only removed after at least one
 * canonical write succeeds.
 */
async function migrateLegacy(data: AppData): Promise<void> {
  const serialised = JSON.stringify(data)
  const thresholdMB = data.prefs?.localStorageThresholdMB ?? 4
  let written = false
  try {
    await set(DATA_KEY, serialised, DB_STORE)
    written = true
  } catch {
    // Try the localStorage mirror below.
  }
  if (mirror(serialised, thresholdMB)) written = true
  if (!written) return
  await removeLegacyCopies()
}

export async function loadPersisted(): Promise<LoadResult> {
  const [idbRaw, legacyIdbRaw] = await Promise.all([
    readIndexed(DB_STORE),
    readIndexed(LEGACY_DB_STORE),
  ])
  const lsRaw = readLocal(LOCAL_DATA_KEY)
  const legacyLsRaw = readLocal(LEGACY_LOCAL_DATA_KEY)

  const candidates: StoredCandidate[] = [
    { raw: idbRaw, source: 'indexeddb', legacy: false },
    { raw: lsRaw, source: 'localstorage', legacy: false },
    { raw: legacyIdbRaw, source: 'indexeddb', legacy: true },
    { raw: legacyLsRaw, source: 'localstorage', legacy: true },
  ]

  const valid: ValidCandidate[] = []
  for (const candidate of candidates) {
    const parsed = parseCandidate(candidate.raw)
    if (parsed) valid.push({ ...candidate, data: parsed.data, version: parsed.version })
  }

  if (valid.length) {
    const chosen = valid.reduce((newest, candidate) =>
      candidate.data.updatedAt > newest.data.updatedAt ? candidate : newest,
    )
    if (chosen.version < SCHEMA_VERSION) {
      backupBeforeMigration(chosen.raw, chosen.version)
      try {
        await savePersisted(chosen.data)
      } catch {
        // The in-memory copy is migrated and the autosave will retry.
      }
    }
    if (chosen.legacy) await migrateLegacy(chosen.data)
    else await removeLegacyCopies()
    return { data: chosen.data, source: chosen.source }
  }

  const corruptRaw = idbRaw ?? lsRaw ?? legacyIdbRaw ?? legacyLsRaw
  if (corruptRaw) {
    quarantine(corruptRaw)
    return { data: null, source: 'seed', issue: 'corrupt' }
  }
  return { data: null, source: 'seed', issue: 'empty' }
}

export async function savePersisted(data: AppData): Promise<'indexeddb' | 'localstorage'> {
  const serialised = JSON.stringify(data)
  const thresholdMB = data.prefs?.localStorageThresholdMB ?? 4
  try {
    await set(DATA_KEY, serialised, DB_STORE)
    mirror(serialised, thresholdMB)
    return 'indexeddb'
  } catch {
    // Fall back to localStorage so a save is never silently lost.
    localStorage.setItem(LOCAL_DATA_KEY, serialised)
    return 'localstorage'
  }
}

function mirror(serialised: string, thresholdMB: number = 4): boolean {
  try {
    const effectiveMB = Math.min(thresholdMB, LOCAL_MIRROR_CAP_MB)
    const thresholdBytes = effectiveMB * 1_000_000
    if (serialised.length < thresholdBytes) {
      localStorage.setItem(LOCAL_DATA_KEY, serialised)
      return true
    }
  } catch {
    // Quota exceeded: IndexedDB remains the source of truth.
  }
  return false
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
    await del(DATA_KEY, LEGACY_DB_STORE)
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(LOCAL_DATA_KEY)
    localStorage.removeItem(LEGACY_LOCAL_DATA_KEY)
  } catch {
    // ignore
  }
}

/** Read and migrate the pre-rename theme key. */
export function readThemePreference(): string | null {
  try {
    const current = localStorage.getItem(LOCAL_THEME_KEY)
    if (current === 'dark' || current === 'light') {
      localStorage.removeItem(LEGACY_LOCAL_THEME_KEY)
      return current
    }
    const legacy = localStorage.getItem(LEGACY_LOCAL_THEME_KEY)
    if (legacy === 'dark' || legacy === 'light') {
      localStorage.setItem(LOCAL_THEME_KEY, legacy)
      localStorage.removeItem(LEGACY_LOCAL_THEME_KEY)
      return legacy
    }
  } catch {
    // localStorage can be unavailable in private modes.
  }
  return null
}

export function persistTheme(theme: Theme, resolvedDark: boolean): void {
  try {
    if (theme === 'system') localStorage.removeItem(LOCAL_THEME_KEY)
    else localStorage.setItem(LOCAL_THEME_KEY, resolvedDark ? 'dark' : 'light')
    localStorage.removeItem(LEGACY_LOCAL_THEME_KEY)
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

/** Check if localStorage mirror is enabled based on current data size. */
export async function isLocalStorageMirrorEnabled(): Promise<boolean> {
  try {
    const data = await get<AppData>(DATA_KEY, DB_STORE)
    if (!data) return true
    const serialised = JSON.stringify(data)
    const thresholdMB = Math.min(data.prefs?.localStorageThresholdMB ?? 4, LOCAL_MIRROR_CAP_MB)
    const thresholdBytes = thresholdMB * 1_000_000
    return serialised.length < thresholdBytes
  } catch {
    return true
  }
}

/** True when the stored data has grown past the learner's guard. Advisory only. */
export function isOverStorageGuard(sizeBytes: number, guardMB?: number): boolean {
  const guard = guardMB ?? DEFAULT_STORAGE_GUARD_MB
  return sizeBytes > guard * 1_000_000
}
