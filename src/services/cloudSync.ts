import type { Auth, User } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import type { AppData } from '../types/schema'
import type { MigratableAppData } from './validation'
import { getStoredAppData, useAppStore } from '../store/AppStore'
import { useSyncStore } from '../store/syncStore'
import { mergeAppData, splitForCloud } from './syncMerge'
import { migrateAppData } from './validation'

/**
 * Optional cloud sync. The app is fully local until the learner signs in, and
 * every remote payload is migrated and merged before it reaches the store.
 *
 * The Firebase config is public client data (`VITE_FIREBASE_*`). The Velona AI
 * key is never part of AppData, so it can never reach Firestore.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const DEVICE_KEY = 'skillmastery:device-id'
const CORE_LIMIT_BYTES = 900_000
const WEEK_LIMIT_BYTES = 700_000
const PUSH_DEBOUNCE_MS = 4_000

export function cloudConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
}

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function setStatus(patch: Parameters<ReturnType<typeof useSyncStore.getState>['set']>[0]): void {
  useSyncStore.getState().set(patch)
}

let auth: Auth | null = null
let db: Firestore | null = null
let uid: string | null = null
let started = false
let busy = false
let timer: ReturnType<typeof setTimeout> | null = null
let stopStore: (() => void) | null = null

async function boot(): Promise<void> {
  const { initializeApp, getApps } = await import('firebase/app')
  const authMod = await import('firebase/auth')
  const firestore = await import('firebase/firestore')

  const app = getApps()[0] ?? initializeApp(config as Record<string, string>)
  auth = authMod.getAuth(app)
  try {
    firestore.initializeFirestore(app, { ignoreUndefinedProperties: true })
  } catch {
    // Already initialised by another call.
  }
  db = firestore.getFirestore(app)

  await authMod.setPersistence(auth, authMod.browserLocalPersistence).catch(() => {})
  await authMod.getRedirectResult(auth).catch(() => {})

  authMod.onAuthStateChanged(auth, (user) => {
    void onUser(user)
  })
}

async function onUser(user: User | null): Promise<void> {
  uid = user?.uid ?? null
  if (!user) {
    stopStore?.()
    stopStore = null
    setStatus({ phase: 'signed-out', email: undefined })
    return
  }
  setStatus({ phase: 'syncing', email: user.email ?? undefined, error: undefined })
  await syncNow()
  watchLocalChanges()
}

function watchLocalChanges(): void {
  stopStore?.()
  stopStore = useAppStore.subscribe((state, previous) => {
    if (state.updatedAt === previous.updatedAt || !uid) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void pushNow()
    }, PUSH_DEBOUNCE_MS)
  })
}

export async function startCloudSync(): Promise<void> {
  if (started) return
  started = true
  if (!cloudConfigured()) {
    setStatus({ phase: 'off', configured: false })
    return
  }
  setStatus({ phase: 'signed-out', configured: true })
  try {
    await boot()
  } catch (error) {
    setStatus({ phase: 'error', configured: true, error: message(error) })
  }
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) {
    setStatus({ phase: 'error', error: 'Cloud sync is not configured on this build.' })
    return
  }
  const authMod = await import('firebase/auth')
  const provider = new authMod.GoogleAuthProvider()
  const standalone = window.matchMedia('(display-mode: standalone)').matches
  try {
    if (standalone) {
      await authMod.signInWithRedirect(auth, provider)
    } else {
      await authMod.signInWithPopup(auth, provider)
    }
  } catch (error) {
    const code = (error as { code?: string }).code ?? ''
    if (code.includes('popup-blocked') || code.includes('operation-not-supported')) {
      await authMod.signInWithRedirect(auth, provider)
      return
    }
    setStatus({ phase: 'error', error: message(error) })
  }
}

export async function signOutOfCloud(): Promise<void> {
  if (!auth) return
  const authMod = await import('firebase/auth')
  await authMod.signOut(auth)
}

async function pullRemote(): Promise<AppData | null> {
  if (!db || !uid) return null
  const firestore = await import('firebase/firestore')
  const coreSnap = await firestore.getDoc(firestore.doc(db, 'users', uid, 'state', 'core'))
  if (!coreSnap.exists()) return null

  const plans: AppData['dayPlans'] = {}
  const plansSnap = await firestore.getDocs(
    firestore.collection(db, 'users', uid, 'dayPlans'),
  )
  plansSnap.forEach((entry) => {
    const value = entry.data() as { weekId?: string; days?: unknown }
    if (value.weekId && Array.isArray(value.days)) {
      plans[value.weekId] = value.days as AppData['dayPlans'][string]
    }
  })

  const candidate = { ...coreSnap.data(), dayPlans: plans } as unknown as MigratableAppData
  return migrateAppData(candidate)
}

async function pushNow(): Promise<void> {
  if (!db || !uid || busy) return
  const database = db
  const user = uid
  busy = true
  try {
    const data = getStoredAppData()
    const { core, weeks, dayPlans } = splitForCloud(data)
    const encoder = new TextEncoder()
    const coreBytes = encoder.encode(JSON.stringify(core)).length
    if (coreBytes > CORE_LIMIT_BYTES) {
      throw new Error(
        `Progress is ${Math.round(coreBytes / 1000)} KB, over the 900 KB cloud budget. Export a backup first.`,
      )
    }

    const firestore = await import('firebase/firestore')
    const batch = firestore.writeBatch(database)
    const at = Date.now()
    batch.set(firestore.doc(database, 'users', user, 'state', 'core'), {
      ...core,
      deviceId: deviceId(),
      updatedAt: at,
    })
    weeks.forEach((weekId, index) => {
      const days = dayPlans[index] ?? []
      if (encoder.encode(JSON.stringify(days)).length > WEEK_LIMIT_BYTES) {
        throw new Error(`Week ${weekId} is too large to sync. Export a backup first.`)
      }
      batch.set(firestore.doc(database, 'users', user, 'dayPlans', weekId), {
        weekId,
        days,
        deviceId: deviceId(),
        updatedAt: at,
      })
    })
    await batch.commit()
    setStatus({ phase: 'synced', lastSyncedAt: at, error: undefined })
  } catch (error) {
    setStatus({ phase: 'error', error: message(error) })
  } finally {
    busy = false
  }
}

/** Pull, merge, then push. Safe to call from Settings or on sign-in. */
export async function syncNow(): Promise<void> {
  if (!db || !uid || busy) return
  busy = true
  setStatus({ phase: 'syncing', error: undefined })
  try {
    const remote = await pullRemote()
    if (remote) {
      const merged = mergeAppData(getStoredAppData(), remote)
      useAppStore.getState().importData(merged, 'replace')
    }
    busy = false
    await pushNow()
  } catch (error) {
    setStatus({ phase: 'error', error: message(error) })
  } finally {
    busy = false
  }
}
