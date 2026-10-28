import {
  ArrowRight,
  HelpCircle,
  Library,
  Network,
  Redo2,
  Settings,
  Undo2,
} from 'lucide-react'
import { Sheet } from '../ui/Sheet'
import { Button } from '../ui/primitives'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { listHistory } from '../../services/history'
import { useRedoDepth, useUndoDepth } from '../../hooks/useHistoryDepth'
import { navigate } from '../../lib/router'

const EXTRA_VIEWS = [
  { href: '#/map', label: 'Map', description: 'Concepts and prerequisites', icon: Network },
  { href: '#/library', label: 'Library', description: 'Docs, books and links', icon: Library },
  { href: '#/help', label: 'Help', description: 'How the app and course work', icon: HelpCircle },
]

export function MobileMoreSheet() {
  const closeMore = useUiStore((state) => state.closeMore)
  const openSettings = useUiStore((state) => state.openSettings)
  const toast = useUiStore((state) => state.toast)
  const undo = useAppStore((state) => state.undo)
  const redo = useAppStore((state) => state.redo)
  const undoDepth = useUndoDepth()
  const redoDepth = useRedoDepth()

  const handleUndo = () => {
    const entry = listHistory()[0]
    const ok = undo()
    toast(ok ? `Undid: ${entry?.label ?? 'last change'}` : 'Nothing to undo.', 'info', 3000)
    if (ok) closeMore()
  }

  const handleRedo = () => {
    const ok = redo()
    toast(ok ? 'Redid the last change.' : 'Nothing to redo.', 'info', 3000)
    if (ok) closeMore()
  }

  return (
    <Sheet title="More" eyebrow="Everything else" onClose={closeMore}>
      <nav aria-label="More views">
        <ul className="space-y-1">
          {EXTRA_VIEWS.map((entry) => {
            const Icon = entry.icon
            return (
              <li key={entry.href}>
                <a
                  href={entry.href}
                  onClick={closeMore}
                  className="flex items-center gap-3 rounded-xl border border-line bg-s1 px-3 py-2.5 transition hover:border-line-strong hover:bg-s2"
                >
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-s2 text-t2">
                    <Icon size={16} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">{entry.label}</span>
                    <span className="faint block text-[10.5px]">{entry.description}</span>
                  </span>
                  <ArrowRight size={14} className="flex-none text-t3" aria-hidden />
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-4 border-t border-line pt-3">
        <p className="eyebrow">This session</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Undo2 size={14} />}
            disabled={undoDepth === 0}
            onClick={handleUndo}
          >
            Undo{undoDepth > 0 ? ` (${undoDepth})` : ''}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Redo2 size={14} />}
            disabled={redoDepth === 0}
            onClick={handleRedo}
          >
            Redo{redoDepth > 0 ? ` (${redoDepth})` : ''}
          </Button>
        </div>
        <p className="faint mt-1.5 text-[10.5px]">History clears when the page reloads.</p>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => {
            closeMore()
            openSettings()
          }}
          className="flex w-full items-center gap-3 rounded-xl border border-line bg-s1 px-3 py-2.5 text-left transition hover:border-line-strong hover:bg-s2"
        >
          <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-s2 text-t2">
            <Settings size={16} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold">Settings</span>
            <span className="faint block text-[10.5px]">Theme, backup, restore, reset</span>
          </span>
          <ArrowRight size={14} className="flex-none text-t3" aria-hidden />
        </button>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <Button variant="ghost" size="sm" className="w-full" onClick={() => { closeMore(); navigate('#/today') }}>
          Back to Today
        </Button>
      </div>
    </Sheet>
  )
}
