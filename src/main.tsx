import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Capture the install prompt before React hydration; Settings exposes the button.
import './services/install'
import App from './App'
import type { Theme } from './types/schema'
import { createSeedData } from './data/seedData'
import {
  applyHydratedData,
  getStoredAppData,
  startAutosave,
  useAppStore,
} from './store/AppStore'
import { loadPersisted, readThemePreference, savePersisted } from './services/storage'
import type { LoadResult } from './services/storage'
import { setSaveState } from './services/saveStatus'

function resolveDark(theme: Theme): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: Theme): void {
  const dark = resolveDark(theme)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.documentElement.dataset['accent'] =
    useAppStore.getState().subjects.find((subject) => subject.id === useAppStore.getState().activeSubjectId)
      ?.accent ?? 'sky'
}

function bootTheme(): void {
  try {
    const stored = readThemePreference()
    if (stored === 'dark' || stored === 'light') {
      applyTheme(stored)
      return
    }
  } catch {
    // localStorage may be unavailable in private modes; the media query still works.
  }
  applyTheme('system')
}

async function boot(): Promise<void> {
  bootTheme()
  const root = createRoot(document.getElementById('root')!)

  let result: LoadResult
  try {
    result = await loadPersisted()
  } catch {
    result = { data: null, source: 'seed' as const, issue: 'corrupt' as const }
  }

  const data = result.data ?? createSeedData()
  applyHydratedData(data, result.issue === 'corrupt' ? 'corrupt' : null)
  applyTheme(data.prefs.theme)

  startAutosave()

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  document.getElementById('boot')?.remove()

  setSaveState('saving')
  try {
    await savePersisted(getStoredAppData())
    setSaveState('saved')
  } catch (error) {
    setSaveState('error', error instanceof Error ? error.message : 'Could not write local storage')
  }
}

void boot()
