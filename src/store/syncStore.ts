import { create } from 'zustand'

export type SyncPhase = 'off' | 'signed-out' | 'syncing' | 'synced' | 'error'

interface SyncStatus {
  phase: SyncPhase
  configured: boolean
  email?: string
  lastSyncedAt?: number
  error?: string
  set: (patch: Partial<Omit<SyncStatus, 'set'>>) => void
}

/**
 * Sync status is ephemeral UI state, never persisted and never part of AppData.
 * It exists so Settings can tell the truth about the last push or pull.
 */
export const useSyncStore = create<SyncStatus>((set) => ({
  phase: 'off',
  configured: false,
  set: (patch) => set(patch),
}))
