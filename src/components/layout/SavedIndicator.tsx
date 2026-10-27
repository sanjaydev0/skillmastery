import { useSaveStatus } from '../../services/saveStatus'
import { formatTime } from '../../lib/dates'
import { cn } from '../../lib/utils'

export function SavedIndicator({ compact = false }: { compact?: boolean }) {
  const { state, savedAt, error } = useSaveStatus()

  const label = state === 'saving' ? 'Saving…' : state === 'error' ? 'Save failed' : state === 'idle' ? 'Not saved yet' : 'Saved offline'
  const dot =
    state === 'saving'
      ? 'var(--warn)'
      : state === 'error'
        ? 'var(--bad)'
        : state === 'saved'
          ? 'var(--good)'
          : 'var(--text-3)'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11.5px] font-medium',
        state === 'error' ? 'text-bad' : 'text-t2',
      )}
      title={
        state === 'error'
          ? error ?? 'Could not write to local storage'
          : savedAt
            ? `Stored in IndexedDB on this device at ${formatTime(savedAt)}`
            : 'Stored in IndexedDB on this device'
      }
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', state === 'saving' ? 'animate-pulse' : '')}
        style={{ background: dot }}
        aria-hidden
      />
      <span className={compact ? 'sr-only' : 'hidden sm:inline'}>{label}</span>
      {compact ? <span className="sm:hidden">{state === 'saving' ? 'Saving' : state === 'error' ? 'Error' : 'Saved'}</span> : null}
    </span>
  )
}
