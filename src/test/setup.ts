import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { createSeedData } from '../data/seedData'
import { useAppStore } from '../store/AppStore'
import { useUiStore } from '../store/uiStore'
import { clearHistory } from '../services/history'

type MediaListener = (event: MediaQueryListEvent) => void

const mediaListeners = new Set<MediaListener>()

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark') ? true : false,
    media: query,
    onchange: null,
    addListener: (listener: MediaListener) => mediaListeners.add(listener),
    removeListener: (listener: MediaListener) => mediaListeners.delete(listener),
    addEventListener: (_event: string, listener: MediaListener) => mediaListeners.add(listener),
    removeEventListener: (_event: string, listener: MediaListener) => mediaListeners.delete(listener),
    dispatchEvent: () => false,
  })),
})

if (!('storage' in navigator)) {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      estimate: async () => ({ usage: 4096, quota: 1024 * 1024 * 64 }),
      persist: async () => true,
      persisted: async () => false,
    },
  })
}

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
}

window.scrollTo = vi.fn()
HTMLElement.prototype.scrollIntoView = vi.fn()
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function resetState(): void {
  clearHistory()
  useAppStore.setState({ ...createSeedData(), hydrated: true, bootIssue: null })
  useUiStore.setState({
    paletteOpen: false,
    settingsOpen: false,
    subjectSheetOpen: false,
    moreOpen: false,
    toasts: [],
  })
  try {
    localStorage.clear()
  } catch {
    // jsdom without localStorage should not break a test.
  }
  window.location.hash = '#/today'
}

beforeEach(resetState)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
