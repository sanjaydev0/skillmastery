import { useSyncExternalStore } from 'react'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface SaveSnapshot {
  state: SaveState
  savedAt: number
  error?: string
}

let snapshot: SaveSnapshot = { state: 'idle', savedAt: 0 }
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function setSaveState(state: SaveState, error?: string): void {
  snapshot = {
    state,
    savedAt: state === 'saved' ? Date.now() : snapshot.savedAt,
    ...(error ? { error } : {}),
  }
  emit()
}

export function getSaveSnapshot(): SaveSnapshot {
  return snapshot
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSaveStatus(): SaveSnapshot {
  return useSyncExternalStore(subscribe, getSaveSnapshot, getSaveSnapshot)
}
