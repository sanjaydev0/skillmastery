import { useState } from 'react'
import { Check, ChevronDown, Layers, Plus } from 'lucide-react'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { useHashRoute, navigate } from '../../lib/router'
import { cn } from '../../lib/utils'
import { Sheet } from '../ui/Sheet'
import { Button, ProgressBar } from '../ui/primitives'

export function TrackSwitcher({ compact = false, dense = false }: { compact?: boolean; dense?: boolean }) {
  const subjects = useAppStore((state) => state.subjects)
  const activeId = useAppStore((state) => state.activeSubjectId)
  const setActiveSubject = useAppStore((state) => state.setActiveSubject)
  const openSubjectSheet = useUiStore((state) => state.openSubjectSheet)
  const [open, setOpen] = useState(false)
  const route = useHashRoute()
  const active = subjects.find((subject) => subject.id === activeId) ?? subjects[0]

  if (!active) return null

  const switchTo = (id: string) => {
    setActiveSubject(id)
    setOpen(false)
    if (route.detail) navigate(`#/${route.view}`)
  }

  if (compact) {
    return (
      <>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Switch track. Current: ${active.name}`}
          title={`Track: ${active.name}`}
          onClick={() => setOpen(true)}
        >
          <Layers size={17} />
        </button>
        <SwitchSheet
          open={open}
          onClose={() => setOpen(false)}
          subjects={subjects}
          activeId={active.id}
          onSwitch={switchTo}
          onCreate={() => {
            setOpen(false)
            openSubjectSheet()
          }}
        />
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center rounded-xl border border-line bg-s1 text-left transition hover:border-line-strong hover:bg-s2',
          dense ? 'min-h-11 gap-1.5 px-2 py-1' : 'gap-2.5 px-3 py-2.5',
        )}
        aria-haspopup="dialog"
        aria-label={`Switch subject track. Current: ${active.name}`}
        title="Switch subject track"
      >
        <span
          className={cn(
            'grid flex-none place-items-center rounded-lg font-bold',
            dense ? 'h-6 w-6 text-[9.5px]' : 'h-8 w-8 text-[12px]',
          )}
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
          aria-hidden
        >
          {active.shortName.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate font-semibold', dense ? 'text-[11px]' : 'text-[12.5px]')}>
            {active.shortName}
          </span>
          {!dense ? (
            <span className="faint block text-[10.5px]">{active.weeks.length} weeks · switch track</span>
          ) : null}
        </span>
        <ChevronDown size={14} className="flex-none text-t3" aria-hidden />
      </button>
      <SwitchSheet
        open={open}
        onClose={() => setOpen(false)}
        subjects={subjects}
        activeId={active.id}
        onSwitch={switchTo}
        onCreate={() => {
          setOpen(false)
          openSubjectSheet()
        }}
      />
    </>
  )
}

function SwitchSheet({
  open,
  onClose,
  subjects,
  activeId,
  onSwitch,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  subjects: ReturnType<typeof useAppStore.getState>['subjects']
  activeId: string
  onSwitch: (id: string) => void
  onCreate: () => void
}) {
  if (!open) return null
  return (
    <Sheet
      title="Switch learning track"
      eyebrow="Two contexts, one canon"
      onClose={onClose}
      footer={
        <Button variant="soft" icon={<Plus size={14} />} onClick={onCreate} className="w-full">
          Create new subject track
        </Button>
      }
    >
      <p className="muted mb-4 text-[12.5px]">
        Each track keeps its own weeks, knowledge graph and deck. The 30-minute passive canon is shared
        because reading progress belongs to you, not to a technology.
      </p>
      <div className="space-y-2">
        {subjects.map((subject) => {
          const mastered = subject.nodes.filter((node) => node.status === 'mastered').length
          const gates = subject.weeks.filter((week) => week.gate.passedAt).length
          const isActive = subject.id === activeId
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSwitch(subject.id)}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition',
                isActive ? 'border-accent/40 bg-accent-soft' : 'border-line bg-s1 hover:bg-s2',
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg text-[11px] font-bold"
                  style={{
                    background: isActive ? 'var(--accent)' : 'var(--surface-3)',
                    color: isActive ? 'var(--accent-contrast)' : 'var(--text-2)',
                  }}
                  aria-hidden
                >
                  {subject.shortName.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-semibold">{subject.name}</p>
                    {isActive ? <Check size={14} className="flex-none text-accent" aria-label="Active" /> : null}
                  </div>
                  <p className="faint mt-0.5 text-[11.5px]">
                    {gates}/{subject.weeks.length} weeks cleared · {mastered} nodes mastered
                  </p>
                  <ProgressBar
                    value={subject.nodes.length ? mastered / subject.nodes.length : 0}
                    className="mt-2 !h-1.5"
                    label={`${subject.name} mastery`}
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-line bg-s2 px-3 py-2.5">
        <span className="faint text-[11.5px]">Track storage</span>
        <span className="text-[11.5px] font-semibold">IndexedDB · offline</span>
      </div>
    </Sheet>
  )
}
