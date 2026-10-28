import { useSyncExternalStore } from 'react'
import { getAiKey, subscribeAiKey } from '../services/ai'

export function useAiKey(): string {
  return useSyncExternalStore(subscribeAiKey, getAiKey, () => '')
}
