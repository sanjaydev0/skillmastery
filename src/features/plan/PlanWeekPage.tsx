import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  GitBranch,
  Hammer,
  RotateCcw,
  Sparkles,
  Target,
} from 'lucide-react'
import type { Week, Weekday } from '../../types/schema'
import { useActiveSubject, useAppStore, useActiveWeek } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { nodeBadge, weekStatus } from '../../engine/gating'
import type { DaySummary } from '../../engine/estimates'
import {
  estimateOf,
  formatEstimate,
  formatTotal,
  summariseWeek,
} from '../../engine/estimates'
import { formatShortDate, schemaWeekday } from '../../lib/dates'
import { blueprintFor } from '../../data/curriculum/blueprint'
import { cn, percent } from '../../lib/utils'
import { navigate } from '../../lib/router'
import {
  Alert,
  Badge,
  Button,
  CheckRow,
  NodeBadgePill,
  ProgressBar,
  WeekBadge,
} from '../../components/ui/primitives'
import { WeekSheet } from '../curriculum/WeekSheet'
import { MONDAY_FIRST, dayName, dayNumber, modeLabel } from './dayPlan'

export function PlanWeekPage({ weekId }: { weekId: string }) {
  const subject = useActiveSubject()
  const activeWeek = useActiveWeek()
  const overrides = useAppStore((state) => state.overrides)
  const planner = useAppStore((state) => state.planner)
  const toggleChecklist = useAppStore((state) => state.toggleChecklist)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const week = subject.weeks.find((entry) => entry.id === weekId)
  const summary = useMemo(
    () => (week ? summariseWeek(week, planner) : null),
    [week, planner],
  )

  if (!week || !summary) return null

  const status = weekStatus(week, subject.weeks, overrides)
  const phase = subject.phases.find((entry) => entry.id === week.phaseId)
  const nodes = subject.nodes.filter((node) => node.weekId === week.id)
  const today = schemaWeekday()
  const doneTasks = week.checklist.filter((item) => item.done).length
  const ratio = summary.planned.max > 0 ? summary.done.max / summary.planned.max : 0
  const left = summary.remaining
  const blueprint = blueprintFor(week.weekNumber)

  return (
    <div>
      <a
        href="#/plan"
        className="link inline-flex items-center gap-1 text-[11.5px]"
        aria-label="Back to all weeks"
      >
        <ArrowLeft size={12} aria-hidden /> All weeks
      </a>

      <header className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="eyebrow">
            Week {week.weekNumber} · {phase?.name.replace(/^Phase \d+ · /, '') ?? 'Phase'}
          </p>
          <h1 className="h1 mt-1">{week.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <WeekBadge status={status} />
            {activeWeek?.id === week.id ? <Badge tone="accent">Current week</Badge> : null}
            {week.capstone ? <Badge tone="warn">Capstone</Badge> : null}
            <span className="faint text-[11px]">{doneTasks}/{week.checklist.length} tasks done</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={() => setAdvancedOpen(true)}
          >
            Advanced workshop
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('#/today')}>
            Back to today
          </Button>
        </div>
      </header>

      <div className="card mt-3 border-l-[3px] border-l-accent/60 p-3.5">
        <p className="eyebrow">The one idea</p>
        <p className="muted mt-1 text-[13px] leading-relaxed">{week.anchor}</p>
      </div>

      {blueprint ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="card p-3">
            <p className="eyebrow flex items-center gap-1.5">
              <Hammer size={11} aria-hidden /> You build
            </p>
            <p className="mt-1 text-[12.5px] leading-snug font-medium">{blueprint.project}</p>
          </div>
          <div className="card p-3">
            <p className="eyebrow flex items-center gap-1.5">
              <GitBranch size={11} aria-hidden /> Git habit
            </p>
            <p className="mt-1 text-[12.5px] leading-snug font-medium">{blueprint.git}</p>
          </div>
        </div>
      ) : null}

      <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Week totals">
        <WeekStat label="Planned" value={formatTotal(summary.planned)} meta={`${week.checklist.length} tasks`} icon={<Clock3 size={13} />} />
        <WeekStat label="Done" value={formatTotal(summary.done)} meta={`${doneTasks} checked`} icon={<CheckCircle2 size={13} />} />
        <WeekStat label="Left" value={formatTotal(left)} meta="Across seven days" icon={<Target size={13} />} />
        <WeekStat
          label="Checkpoint"
          value={week.gate.passedAt ? 'Cleared' : 'Open'}
          meta={
            week.gate.passedAt
              ? formatShortDate(week.gate.passedAt)
              : week.gate.attempts.length > 0
                ? `${week.gate.attempts.length} attempt${week.gate.attempts.length === 1 ? '' : 's'}`
                : 'No attempt yet'
          }
          icon={<Sparkles size={13} />}
        />
      </section>

      <div className="mt-3 flex items-center gap-2">
        <ProgressBar value={ratio} tone={week.gate.passedAt ? 'good' : 'accent'} className="flex-1 !h-2" label={`Week ${week.weekNumber} estimate`} />
        <span className="faint num text-[10.5px]">{percent(ratio)}% of planned estimate</span>
      </div>

      {week.outcomes.length > 0 ? (
        <section className="card mt-4 p-3.5" aria-labelledby="outcomes-heading">
          <p className="eyebrow">By the end of this week</p>
          <h2 id="outcomes-heading" className="h2 mt-0.5">
            You can do these without notes
          </h2>
          <ul className="mt-2 space-y-1.5">
            {week.outcomes.map((outcome) => (
              <li key={outcome} className="flex items-start gap-2 text-[12.5px] leading-relaxed">
                <CheckCircle2 size={14} className="mt-0.5 flex-none text-good" aria-hidden />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-4" aria-labelledby="days-heading">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
          <div>
            <p className="eyebrow">Monday to Sunday</p>
            <h2 id="days-heading" className="h2 mt-0.5">
              Seven-day plan
            </h2>
          </div>
          <span className="faint text-[10.5px]">
            {summary.overloadedDays.length > 0
              ? `${summary.overloadedDays.length} day${summary.overloadedDays.length === 1 ? '' : 's'} over your capacity`
              : 'All days fit your capacity'}
          </span>
        </div>

        <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2">
          {MONDAY_FIRST.map((day) => {
            const daySummary = summary.days.find((entry) => entry.day === day)!
            return (
              <DayCard
                key={day}
                week={week}
                day={day}
                summary={daySummary}
                isToday={day === today}
                onToggle={(itemId) => toggleChecklist(week.id, itemId)}
              />
            )
          })}
        </div>
      </section>

      <details className="card mt-4 overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3.5 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="eyebrow">Go deeper</p>
            <p className="mt-0.5 text-[13px] font-semibold">The computer science behind this week</p>
          </div>
          <ChevronRight size={16} className="flex-none text-t3" aria-hidden />
        </summary>
        <div className="space-y-4 border-t border-line p-3.5">
          <section>
            <p className="eyebrow">Checkpoint</p>
            <p className="muted mt-1 text-[12.5px] leading-relaxed">{week.gate.notes}</p>
            {week.gate.attempts.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {week.gate.attempts.map((attempt) => (
                  <li key={attempt.at} className="flex items-center justify-between gap-2 rounded-lg bg-s2 px-2.5 py-1.5 text-[11.5px]">
                    <span className="num">{formatShortDate(attempt.at)}</span>
                    <span className={attempt.passed ? 'text-good' : 'text-warn'}>
                      {attempt.average.toFixed(1)} avg · {attempt.passed ? 'cleared' : 'not yet'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section>
            <p className="eyebrow">Reading this week</p>
            <p className="muted mt-1 text-[12.5px]">{week.bookFocus}</p>
          </section>

          {nodes.length > 0 ? (
            <section>
              <p className="eyebrow">Concepts behind the tasks</p>
              <div className="mt-1.5 space-y-1.5">
                {nodes.map((node) => (
                  <div key={node.id} className="rounded-xl border border-line bg-s1 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12.5px] font-semibold">{node.title}</p>
                      <NodeBadgePill status={nodeBadge(node, subject, overrides)} />
                    </div>
                    <p className="faint mt-1 text-[11px]">
                      {node.knowledgePoints.length} recall point{node.knowledgePoints.length === 1 ? '' : 's'}
                      {node.tags.length > 0 ? ` · ${node.tags.slice(0, 3).join(', ')}` : ''}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="link mt-2 inline-flex items-center gap-1 text-[11.5px]"
                onClick={() => navigate(`#/node/${nodes[0]!.id}`)}
              >
                Open the first concept <ExternalLink size={11} aria-hidden />
              </button>
            </section>
          ) : null}

          {week.rabbitHoles.length > 0 ? (
            <Alert tone="warn" title="Do not rabbit-hole this week">
              <ul className="list-disc space-y-1 pl-4">
                {week.rabbitHoles.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <section className="flex flex-wrap items-start justify-between gap-3 border-t border-line pt-3">
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold">Need the full workshop?</p>
              <p className="faint mt-0.5 max-w-md text-[11px]">
                Score the checkpoint, edit tasks and manage the concept graph. Changes are local and undoable.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="soft" size="sm" icon={<BookOpen size={13} />} onClick={() => setAdvancedOpen(true)}>
                Open workshop
              </Button>
              <ResetWeekButton weekId={week.id} />
            </div>
          </section>
        </div>
      </details>

      {advancedOpen ? <WeekSheet weekId={week.id} onClose={() => setAdvancedOpen(false)} /> : null}
    </div>
  )
}

function DayCard({
  week,
  day,
  summary,
  isToday,
  onToggle,
}: {
  week: Week
  day: Weekday
  summary: DaySummary
  isToday: boolean
  onToggle: (itemId: string) => void
}) {
  const done = summary.items.filter((item) => item.done).length
  const total = summary.items.length
  const overActive = summary.overBy.active
  const overPassive = summary.overBy.passive

  return (
    <section
      id={`day-${dayNumber(day)}`}
      className={cn('card p-3.5', isToday && 'ring-1 ring-accent/45')}
      aria-label={`Day ${dayNumber(day)} ${dayName(day)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            Day {dayNumber(day)} · {dayName(day)}
            {isToday ? <Badge tone="accent">Today</Badge> : null}
          </p>
          <p className="faint mt-0.5 text-[10.5px]">
            {total === 0 ? 'Buffer day' : `${done}/${total} done`} · {formatTotal(summary.planned)}
          </p>
        </div>
        <span className="flex-none text-right">
          <span className="num block text-[12px] font-semibold">{formatTotal(summary.done)}</span>
          <span className="faint block text-[9.5px]">credited</span>
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Badge tone={overActive > 0 ? 'warn' : 'neutral'}>
          Active {summary.activeMinutes}/{summary.capacity.active} min
        </Badge>
        <Badge tone={overPassive > 0 ? 'warn' : 'neutral'}>
          Passive {summary.passiveMinutes}/{summary.capacity.passive} min
        </Badge>
        {overActive + overPassive > 0 ? (
          <span className="flex items-center gap-1 text-[10px] text-warn">
            <AlertTriangle size={10} aria-hidden />
            Over by {overActive + overPassive} min
          </span>
        ) : null}
      </div>

      {total === 0 ? (
        <p className="faint mt-2.5 rounded-lg border border-dashed border-line px-2.5 py-3 text-[11.5px]">
          Nothing scheduled. Catch up, review your notes, or rest — this is the buffer.
        </p>
      ) : (
        <div className="mt-2 space-y-0.5">
          {summary.items.map((item) => (
            <CheckRow
              key={item.id}
              checked={item.done}
              onToggle={() => onToggle(item.id)}
              label={item.label}
              meta={`${modeLabel(item.context)} · ${formatEstimate(estimateOf(item))}`}
            />
          ))}
        </div>
      )}

      {summary.items.length > 0 ? (
        <p className="faint mt-2 border-t border-line pt-2 text-[10px]">
          Week {week.weekNumber} day {dayNumber(day)} · estimated range, no timer
        </p>
      ) : null}
    </section>
  )
}

function ResetWeekButton({ weekId }: { weekId: string }) {
  const resetProgress = useAppStore((state) => state.resetProgress)
  const toast = useUiStore((state) => state.toast)
  const [armed, setArmed] = useState(false)

  if (!armed) {
    return (
      <Button variant="outline" size="sm" icon={<RotateCcw size={13} />} onClick={() => setArmed(true)}>
        Reset progress
      </Button>
    )
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5 rounded-lg border border-bad/30 bg-bad-soft px-2 py-1.5">
      <span className="text-[10.5px] text-bad">Clear checks and checkpoint attempts?</span>
      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          const result = resetProgress('week', weekId)
          toast(result.message, result.ok ? 'success' : 'error', 6000)
          setArmed(false)
        }}
      >
        Yes, reset
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setArmed(false)}>
        Cancel
      </Button>
    </span>
  )
}

function WeekStat({ label, value, meta, icon }: { label: string; value: string; meta: string; icon: ReactNode }) {
  return (
    <div className="card px-3 py-2.5">
      <div className="flex items-center justify-between gap-1.5">
        <span className="faint truncate text-[9.5px] font-semibold tracking-[0.1em] uppercase">{label}</span>
        <span className="flex-none text-t3" aria-hidden>
          {icon}
        </span>
      </div>
      <p className="num mt-1.5 text-[15px] leading-none font-semibold">{value}</p>
      <p className="faint mt-1 truncate text-[10px]">{meta}</p>
    </div>
  )
}
