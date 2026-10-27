/**
 * Capture the browser's install prompt once, before React mounts, and expose it
 * to the Settings sheet. Chrome fires `beforeinstallprompt` after the manifest
 * and service worker pass its installability checks; listening at module load
 * avoids missing the event while the app is hydrating from IndexedDB.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export interface InstallState {
  canInstall: boolean
  installed: boolean
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean }

function standalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as NavigatorWithStandalone).standalone === true
    )
  } catch {
    return false
  }
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
let state: InstallState = { canInstall: false, installed: standalone() }

function publish(next: InstallState): void {
  state = next
  for (const listener of listeners) listener()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep the browser's mini-infobar out of the way; the Settings sheet owns
    // the explicit install button.
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    publish({ ...state, canInstall: true })
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    publish({ canInstall: false, installed: true })
  })

  try {
    const media = window.matchMedia('(display-mode: standalone)')
    media.addEventListener?.('change', (event) => {
      publish({ ...state, installed: event.matches })
    })
  } catch {
    // Older browsers without matchMedia listeners still get the install event.
  }
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getInstallState(): InstallState {
  return state
}

/**
 * Show the deferred browser install prompt. Returns `unavailable` if Chrome has
 * not offered its prompt yet (for example, before the service worker is active).
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = deferredPrompt
  if (!prompt) return 'unavailable'

  deferredPrompt = null
  publish({ ...state, canInstall: false })

  try {
    await prompt.prompt()
    const choice = await prompt.userChoice
    return choice.outcome
  } catch {
    return 'dismissed'
  }
}
