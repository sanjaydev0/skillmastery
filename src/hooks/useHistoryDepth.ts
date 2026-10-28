import { useSyncExternalStore } from 'react'
import { historyDepth, subscribeHistory } from '../services/history'

function depthOf(kind: 'undo' | 'redo'): number {
  return historyDepth()[kind]
}

export function useUndoDepth(): number {
  return useSyncExternalStore(subscribeHistory, () => depthOf('undo'), () => 0)
}

export function useRedoDepth(): number {
  return useSyncExternalStore(subscribeHistory, () => depthOf('redo'), () => 0)
}
