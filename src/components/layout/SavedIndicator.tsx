import { useEffect, useState } from 'react'
import { useSaveStatus } from '../../services/saveStatus'
import { useSyncStore } from '../../store/syncStore'
import { formatTime } from '../../lib/dates'
import { cn } from '../../lib/utils'

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

type Tone = 'good' | 'warn' | 'bad' | 'idle'

/**
 * One dot for the truth: green when this device and the cloud agree, amber
 * while saving, syncing or offline, red when a write actually failed.
 */
export function SavedIndicator({ compact = false }: { compact?: boolean }) {
  const { state, savedAt, error } = useSaveStatus()
  const { configured, phase, email, lastSyncedAt } = useSyncStore()
  const online = useOnline()
  const signedIn = Boolean(email) && phase !== 'signed-out'

  let tone: Tone = 'good'
  let label = 'Saved'
  let detail = savedAt ? `Saved on this device at ${formatTime(savedAt)}` : 'Saved on this device'

  if (state === 'error') {
    tone = 'bad'
    label = 'Save failed'
    detail = error ?? 'Could not write to local storage'
  } else if (state === 'saving') {
    tone = 'warn'
    label = 'Saving…'
    detail = 'Writing to this device'
  } else if (!configured) {
    tone = 'good'
    label = 'Saved'
  } else if (!signedIn) {
    if (phase === 'error') {
      tone = 'bad'
      label = 'Sync error'
      detail = 'Open Settings → Cloud sync to read the error'
    } else {
      tone = 'idle'
      label = 'Local only'
      detail = 'Signed out. Sign in to sync across devices.'
    }
  } else if (!online) {
    tone = 'warn'
    label = 'Offline'
    detail = 'Saved here. Changes sync when you reconnect.'
  } else if (phase === 'error') {
    tone = 'bad'
    label = 'Sync error'
    detail = 'Open Settings → Cloud sync to read the error'
  } else if (phase === 'syncing') {
    tone = 'warn'
    label = 'Syncing…'
    detail = 'Merging with your other device'
  } else {
    tone = 'good'
    label = 'Synced'
    detail = lastSyncedAt ? `Last sync at ${formatTime(lastSyncedAt)}` : 'Signed in'
  }

  const dot =
    tone === 'good' ? 'var(--good)' : tone === 'warn' ? 'var(--warn)' : tone === 'bad' ? 'var(--bad)' : 'var(--text-3)'
  const pulse = tone === 'warn' && (phase === 'syncing' || state === 'saving')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11.5px] font-medium',
        tone === 'bad' ? 'text-bad' : tone === 'idle' ? 'text-t3' : 'text-t2',
      )}
      title={detail}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', pulse ? 'animate-pulse' : '')}
        style={{ background: dot }}
        aria-hidden
      />
      <span className={compact ? '' : 'hidden sm:inline'}>{label}</span>
    </span>
  )
}
