import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Lock,
  Plus,
  Printer,
  Sparkles,
} from 'lucide-react'
import type { Phase, Week } from '../../types/schema'
import { useActiveSubject, useActiveWeek, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import {
  missingWeekPrereqs,
  nodeBadge,
  overallMastery,
  weekProgress,
  weekStatus,
} from '../../engine/gating'
import { dueCards } from '../../engine/srs'
import { formatShortDate } from '../../lib/dates'
import { cn, percent } from '../../lib/utils'
import { navigate } from '../../lib/router'
import { Sheet } from '../../components/ui/Sheet'
import {
  Badge,
  Button,
  EmptyState,
  Field,
  InlineError,
  ProgressBar,
  WeekBadge,
} from '../../components/ui/primitives'

export function CurriculumView() {
  const subject = useActiveSubject()
  const active = useActiveWeek()
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const [addOpen, setAddOpen] = useState(false)

  const orderedWeeks = useMemo(
    () => [...subject.weeks].sort((a, b) => a.weekNumber - b.weekNumber),
    [subject.weeks],
  )
  const cleared = orderedWeeks.filter((week) => week.gate.passedAt).length
  const due = dueCards(subject.cards).length
  const masteredNodes = subject.nodes.filter((node) => node.status === 'mastered').length

  const phases = subject.phases.filter(
    (phase) => phaseFilter === 'all' || phase.id === phaseFilter,
  )

  return (
    <div>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">The week-by-week operating system</p>
          <h1 className="h1 mt-1">Curriculum</h1>
          <p className="muted mt-1 max-w-2xl text-[13px]">
            Calendar order is not mastery order. Each week opens only after the previous blind gate clears.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Printer size={14} />}
            onClick={() => window.print()}
          >
            Print plan
          </Button>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            Add week
          </Button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Gates cleared', `${cleared}/${orderedWeeks.length}`, <CheckCircle2 key="g" size={14} />],
          ['Node mastery', `${percent(overallMastery(subject.nodes))}%`, <Sparkles key="n" size={14} />],
          ['Cards due', `${due}`, <CalendarDays key="d" size={14} />],
          ['Mastered nodes', `${masteredNodes}/${subject.nodes.length}`, <Lock key="m" size={14} />],
        ].map(([label, value, icon]) => (
          <div key={String(label)} className="card flex items-center gap-2.5 px-3 py-2.5">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-s2 text-t2" aria-hidden>
              {icon}
            </span>
            <div className="min-w-0">
              <p className="faint truncate text-[11px] tracking-wide">{label}</p>
              <p className="num text-[14px] font-semibold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="card mt-4 p-2.5 sm:p-3" aria-label="Phase map">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="eyebrow">Phase map</p>
          {phaseFilter !== 'all' ? (
            <button type="button" className="link text-[11px]" onClick={() => setPhaseFilter('all')}>
              Show all weeks
            </button>
          ) : null}
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
          {subject.phases.map((phase, index) => {
            const phaseWeeks = orderedWeeks.filter((week) => week.phaseId === phase.id)
            const phaseCleared = phaseWeeks.filter((week) => week.gate.passedAt).length
            const selected = phaseFilter === phase.id
            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => setPhaseFilter(selected ? 'all' : phase.id)}
                className={cn(
                  'rounded-xl border p-2.5 text-left transition',
                  selected
                    ? 'border-accent/40 bg-accent-soft'
                    : 'border-line bg-s1 hover:border-line-strong hover:bg-s2',
                )}
                aria-pressed={selected}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow">Phase {index + 1}</span>
                  <span className="faint num text-[11px]">
                    {phaseCleared}/{phaseWeeks.length}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[12px] font-semibold">{phase.name.replace(/^Phase \d+ · /, '')}</p>
                <ProgressBar
                  value={phaseWeeks.length ? phaseCleared / phaseWeeks.length : 0}
                  className="mt-2 !h-1.5"
                  tone={phaseCleared === phaseWeeks.length && phaseWeeks.length > 0 ? 'good' : 'accent'}
                  label={`${phase.name} gates`}
                />
                <p className="faint mt-1 line-clamp-1 text-[11px]">{phase.subtitle}</p>
              </button>
            )
          })}
        </div>
      </section>

      {orderedWeeks.length === 0 ? (
        <div className="card mt-4">
          <EmptyState
            icon={<CalendarDays size={18} />}
            title="This track has no weeks"
            description="Add a Week 1 with an anchor, outcomes and a blind gate. The rest of the track will build on it."
            action={
              <Button variant="primary" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
                Add Week 1
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {phases.map((phase) => {
            const weeks = orderedWeeks.filter((week) => week.phaseId === phase.id)
            const phaseCleared = weeks.filter((week) => week.gate.passedAt).length
            if (weeks.length === 0) {
              return (
                <section key={phase.id}>
                  <div className="flex items-end justify-between gap-2 border-b border-line pb-2">
                    <PhaseHeading phase={phase} index={subject.phases.indexOf(phase) + 1} />
                    <span className="faint text-[11px]">No weeks yet</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-4 text-[11.5px] text-t3 hover:border-line-strong hover:text-t2"
                  >
                    <Plus size={13} /> Add a week to this phase
                  </button>
                </section>
              )
            }
            return (
              <section key={phase.id}>
                <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
                  <PhaseHeading phase={phase} index={subject.phases.indexOf(phase) + 1} />
                  <div className="flex items-center gap-2">
                    <span className="faint num text-[11.5px]">
                      {phaseCleared}/{weeks.length} gates
                    </span>
                    <ProgressBar
                      value={weeks.length ? phaseCleared / weeks.length : 0}
                      className="w-24 !h-1.5"
                      label={`${phase.name} progress`}
                    />
                  </div>
                </div>
                <div className="mt-2.5 grid gap-2 md:grid-cols-2 xl:gap-2.5">
                  {weeks.map((week) => (
                    <WeekCard key={week.id} week={week} active={active?.id === week.id} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <Button variant="soft" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
          Add a week
        </Button>
      </div>

      {addOpen ? <AddWeekSheet onClose={() => setAddOpen(false)} /> : null}
    </div>
  )
}

function PhaseHeading({ phase, index }: { phase: Phase; index: number }) {
  return (
    <div>
      <p className="eyebrow">Phase {index}</p>
      <h2 className="h2 mt-0.5">{phase.name.replace(/^Phase \d+ · /, '')}</h2>
      <p className="faint mt-0.5 text-[11px]">{phase.subtitle}</p>
    </div>
  )
}

function WeekCard({ week, active }: { week: Week; active: boolean }) {
  const subject = useActiveSubject()
  const overrides = useAppStore((state) => state.overrides)
  const status = weekStatus(week, subject.weeks, overrides)
  const missing = missingWeekPrereqs(week, subject.weeks)
  const nodes = subject.nodes.filter((node) => node.weekId === week.id)
  const mastered = nodes.filter((node) => nodeBadge(node, subject, overrides) === 'mastered').length
  const attempts = week.gate.attempts
  const lastAttempt = attempts[attempts.length - 1]
  const overridden = Boolean(overrides.weeks[week.id])

  return (
    <button
      type="button"
      onClick={() => navigate(`#/week/${week.id}`)}
      className={cn(
        'card card-hover group relative overflow-hidden p-3.5 text-left',
        active && 'ring-1 ring-accent/50',
        status === 'locked' && 'opacity-90',
      )}
      aria-label={`Open Week ${week.weekNumber}: ${week.title}`}
    >
      {active ? (
        <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: 'var(--accent)' }} aria-hidden />
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'num grid h-9 w-9 place-items-center rounded-lg border text-[12px] font-bold',
              status === 'mastered'
                ? 'border-good/30 bg-good-soft text-good'
                : status === 'locked'
                  ? 'border-line bg-s2 text-t3'
                  : 'border-accent/25 bg-accent-soft text-accent-strong',
            )}
            aria-hidden
          >
            {String(week.weekNumber).padStart(2, '0')}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-1">
              <WeekBadge status={status} />
              {week.capstone ? <Badge tone="warn">Capstone</Badge> : null}
              {overridden ? <Badge tone="warn">Override</Badge> : null}
            </div>
            <p className="faint mt-0.5 text-[11px]">Week {week.weekNumber}</p>
          </div>
        </div>
        <ArrowRight
          size={15}
          className="mt-1 flex-none text-t3 transition group-hover:translate-x-0.5 group-hover:text-accent"
          aria-hidden
        />
      </div>

      <h3 className="mt-2 line-clamp-2 text-[13.5px] leading-snug font-semibold">{week.title}</h3>
      <p className="muted mt-1 line-clamp-2 text-[11.5px] leading-relaxed">{week.anchor}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        <span className="pill !py-0.5 !text-[11px]">{nodes.length} nodes</span>
        <span className="pill !py-0.5 !text-[11px]">{week.checklist.length} checks</span>
        <span className="pill !py-0.5 !text-[11px]">{mastered} mastered</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <ProgressBar
          value={weekProgress(week)}
          tone={week.gate.passedAt ? 'good' : 'accent'}
          className="flex-1 !h-1.5"
          label={`Week ${week.weekNumber} checks`}
        />
        <span className="faint num text-[11px]">{percent(weekProgress(week))}%</span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className="faint truncate text-[11px]">
          {status === 'locked' && missing.length > 0
            ? `Needs Week ${missing.map((entry) => entry.weekNumber).join(', ')}`
            : week.gate.passedAt
              ? `Gate cleared ${formatShortDate(week.gate.passedAt)}`
              : lastAttempt
                ? `Last gate attempt ${lastAttempt.average.toFixed(1)} avg`
                : week.bookFocus}
        </span>
        <ChevronRight size={12} className="flex-none text-t3" aria-hidden />
      </div>
    </button>
  )
}

function AddWeekSheet({ onClose }: { onClose: () => void }) {
  const subject = useActiveSubject()
  const addWeek = useAppStore((state) => state.addWeek)
  const toast = useUiStore((state) => state.toast)
  const [phaseId, setPhaseId] = useState(subject.phases[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [anchor, setAnchor] = useState('')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Give the week a title.')
      return
    }
    const result = addWeek({ phaseId, title, anchor })
    if (!result.ok) {
      setError(result.message)
      return
    }
    toast(result.message, 'success')
    onClose()
  }

  return (
    <Sheet
      title="Add a week"
      eyebrow={`${subject.shortName} · next number is assigned automatically`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="add-week-form" icon={<Plus size={14} />}>
            Add week
          </Button>
        </>
      }
    >
      <form id="add-week-form" onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-accent/25 bg-accent-soft p-3 text-[12px] leading-relaxed text-t2">
          New weeks start with six default checks: docs, paper, build slice, deliberate error, tests and the blind
          gate. Edit the title and anchor now; refine the rest inside the week.
        </div>
        <Field label="Phase">
          <select className="select" value={phaseId} onChange={(event) => setPhaseId(event.target.value)}>
            {subject.phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Week title">
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Rendering pipelines & frame budgets"
            data-autofocus
            required
          />
        </Field>
        <Field label="First-principles anchor" hint="One sentence that captures the mental model.">
          <textarea
            className="textarea min-h-[92px]"
            value={anchor}
            onChange={(event) => setAnchor(event.target.value)}
            placeholder="The frame budget is a contract: 16.6ms shared across input, layout, paint and GPU."
          />
        </Field>
        {error ? <InlineError>{error}</InlineError> : null}
      </form>
    </Sheet>
  )
}
