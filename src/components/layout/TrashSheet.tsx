import { useState } from 'react'
import { ArchiveRestore, Trash2 } from 'lucide-react'
import type { TrashEntry, TrashKind } from '../../types/schema'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { formatDateTime } from '../../lib/dates'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/primitives'

const KIND_LABEL: Record<TrashKind, string> = {
  week: 'Week',
  subject: 'Track',
  dayPlans: 'Day cards',
  node: 'Concept',
  resource: 'Resource',
}

function countsLine(entry: TrashEntry): string {
  const parts: string[] = []
  if (entry.counts.weeks) parts.push(`${entry.counts.weeks} week${entry.counts.weeks === 1 ? '' : 's'}`)
  if (entry.counts.nodes) parts.push(`${entry.counts.nodes} concept${entry.counts.nodes === 1 ? '' : 's'}`)
  if (entry.counts.cards) parts.push(`${entry.counts.cards} card${entry.counts.cards === 1 ? '' : 's'}`)
  if (entry.counts.days) parts.push(`${entry.counts.days} day card${entry.counts.days === 1 ? '' : 's'}`)
  return parts.length > 0 ? parts.join(', ') : 'No extra items'
}

export function TrashSheet({ onClose }: { onClose: () => void }) {
  const trash = useAppStore((state) => state.trash)
  const restoreTrash = useAppStore((state) => state.restoreTrash)
  const purgeTrash = useAppStore((state) => state.purgeTrash)
  const emptyTrash = useAppStore((state) => state.emptyTrash)
  const toast = useUiStore((state) => state.toast)
  const [armed, setArmed] = useState<string | null>(null)
  const [emptyArmed, setEmptyArmed] = useState(false)

  const restore = (entry: TrashEntry) => {
    const result = restoreTrash(entry.id)
    toast(result.message, result.ok ? 'success' : 'error', 6000)
    setArmed(null)
  }

  const purge = (entry: TrashEntry) => {
    if (armed !== entry.id) {
      setArmed(entry.id)
      return
    }
    purgeTrash(entry.id)
    toast(`“${entry.label}” deleted for good.`, 'info', 5000)
    setArmed(null)
  }

  return (
    <Sheet
      title="Recently deleted"
      eyebrow="Restore, or remove for good"
      onClose={onClose}
      footer={
        <>
          <span className="faint mr-auto text-[11.5px]">
            The last {trash.length === 0 ? '20 deletions' : `${trash.length} deletion${trash.length === 1 ? '' : 's'}`}{' '}
            stay here on this device.
          </span>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <p className="muted text-[12px] leading-relaxed">
        A deleted week keeps its concepts, its cards and its place in the prerequisite graph. Restoring it puts all of
        that back. Removing it here cannot be undone.
      </p>

      {trash.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-line px-3 py-6 text-center">
          <p className="text-[13px] font-semibold">Nothing in the trash</p>
          <p className="faint mt-1 text-[11.5px]">A deleted week or track waits here until you remove it.</p>
        </div>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
            {trash.map((entry) => (
              <li key={entry.id} className="p-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium">
                      <span className="badge">{KIND_LABEL[entry.kind]}</span>
                      <span className="min-w-0 truncate">{entry.label}</span>
                    </p>
                    <p className="faint mt-0.5 text-[11px]">
                      {entry.subjectName ? `${entry.subjectName}, ` : ''}
                      {countsLine(entry)}. Deleted {formatDateTime(entry.deletedAt)}.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="soft"
                      size="sm"
                      icon={<ArchiveRestore size={13} />}
                      onClick={() => restore(entry)}
                    >
                      Restore
                    </Button>
                    <Button
                      variant={armed === entry.id ? 'danger' : 'ghost'}
                      size="sm"
                      icon={<Trash2 size={13} />}
                      onClick={() => purge(entry)}
                    >
                      {armed === entry.id ? 'Delete for good' : 'Delete'}
                    </Button>
                  </div>
                </div>
                {armed === entry.id ? (
                  <p className="mt-1.5 text-[11px] text-bad">
                    This removes the copy in the trash. It cannot be undone.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <p className="faint text-[11px]">Emptying the trash removes every copy below.</p>
            {emptyArmed ? (
              <span className="flex flex-wrap items-center gap-1.5 rounded-lg border border-bad/30 bg-bad-soft px-2 py-1.5">
                <span className="text-[11.5px] text-bad">Delete all {trash.length} items?</span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    emptyTrash()
                    toast('Trash emptied.', 'info', 5000)
                    setEmptyArmed(false)
                  }}
                >
                  Yes, empty it
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEmptyArmed(false)}>
                  Keep them
                </Button>
              </span>
            ) : (
              <Button variant="outline" size="sm" icon={<Trash2 size={13} />} onClick={() => setEmptyArmed(true)}>
                Empty the trash
              </Button>
            )}
          </div>
        </>
      )}
    </Sheet>
  )
}
