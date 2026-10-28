import { useMemo } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
} from 'lucide-react'
import type { Phase, Week } from '../../types/schema'
import { useActiveSubject, useActiveWeek, useAppStore } from '../../store/AppStore'
import { weekStatus } from '../../engine/gating'
import { formatTotal, summariseSubject, summariseWeek } from '../../engine/estimates'
import { blueprintFor } from '../../data/curriculum/blueprint'
import { navigate } from '../../lib/router'
import { CapacitySliders } from '../../components/ui/CapacitySliders'
import { cn, percent } from '../../lib/utils'
import { Badge, Button, ProgressBar, WeekBadge } from '../../components/ui/primitives'

export function PlanView() {
  const subject = useActiveSubject()
  const active = useActiveWeek()
  const overrides = useAppStore((state) => state.overrides)
  const planner = useAppStore((state) => state.planner)
  const startWeekday = useAppStore((state) => state.journey.startWeekday)

  const orderedWeeks = useMemo(
    () => [...subject.weeks].sort((a, b) => a.weekNumber - b.weekNumber),
    [subject.weeks],
  )
  const course = useMemo(() => summariseSubject(subject), [subject])
  const summaries = useMemo(
    () => new Map(orderedWeeks.map((week) => [week.id, summariseWeek(week, planner, startWeekday)])),
    [orderedWeeks, planner, startWeekday],
  )
  const cleared = orderedWeeks.filter((week) => week.gate.passedAt).length

  return (
    <div>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Week by week, day by day</p>
          <h1 className="h1 mt-1">Plan</h1>
          <p className="muted mt-1 max-w-2xl text-[13px]">
            Every week is seven days. Tasks carry estimated ranges, not timers — checking one credits its estimate to
            your totals.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<CalendarDays size={14} />}
            onClick={() => navigate('#/today')}
          >
            Today
          </Button>
          {active ? (
            <Button
              variant="primary"
              size="sm"
              icon={<ChevronRight size={14} />}
              onClick={() => navigate(`#/plan/${active.id}`)}
            >
              Open Week {active.weekNumber}
            </Button>
          ) : null}
        </div>
      </header>

      <section className="ledger mt-4" aria-label="Plan totals">
        <PlanStat label="Weeks" value={String(orderedWeeks.length)} meta={`${cleared} checkpoints cleared`} />
        <PlanStat label="Planned" value={formatTotal(course.planned)} meta={`${course.items} tasks in total`} />
        <PlanStat
          label="Completed"
          value={formatTotal(course.done)}
          meta={`${course.doneItems} of ${course.items} tasks checked`}
        />
        <PlanStat label="Remaining" value={formatTotal(course.remaining)} meta="Estimate range, not a countdown" />
      </section>

      <CapacityEditor />

      {orderedWeeks.length === 0 ? (
        <div className="card mt-4 p-6 text-center">
          <p className="text-[13.5px] font-semibold">This track has no weeks yet</p>
          <p className="muted mt-1 text-[12.5px]">Use the advanced workshop to add a first week.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {subject.phases.map((phase) => {
            const weeks = orderedWeeks.filter((week) => week.phaseId === phase.id)
            if (weeks.length === 0) return null
            return (
              <section key={phase.id} aria-labelledby={`phase-${phase.id}`}>
                <PhaseHeading phase={phase} weeks={weeks} />
                <div className="mt-2.5 grid gap-2 md:grid-cols-2 xl:gap-2.5">
                  {weeks.map((week) => (
                    <WeekPlanCard
                      key={week.id}
                      subjectId={subject.id}
                      week={week}
                      active={active?.id === week.id}
                      status={weekStatus(week, subject.weeks, overrides)}
                      summary={summaries.get(week.id)!}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PhaseHeading({ phase, weeks }: { phase: Phase; weeks: Week[] }) {
  const cleared = weeks.filter((week) => week.gate.passedAt).length
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
      <div>
        <p className="eyebrow">Phase</p>
        <h2 id={`phase-${phase.id}`} className="h2 mt-0.5">
          {phase.name.replace(/^Phase \d+ · /, '')}
        </h2>
        <p className="faint mt-0.5 text-[11px]">{phase.subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="faint num text-[11.5px]">
          {cleared}/{weeks.length} checkpoints
        </span>
        <ProgressBar
          value={weeks.length ? cleared / weeks.length : 0}
          className="w-20 !h-1.5"
          label={`${phase.name} checkpoints`}
        />
      </div>
    </div>
  )
}

function WeekPlanCard({
  subjectId,
  week,
  active,
  status,
  summary,
}: {
  subjectId: string
  week: Week
  active: boolean
  status: ReturnType<typeof weekStatus>
  summary: ReturnType<typeof summariseWeek>
}) {
  const ratio = summary.planned.max > 0 ? summary.done.max / summary.planned.max : 0
  const overloaded = summary.overloadedDays.length
  const doneTasks = week.checklist.filter((item) => item.done).length
  const blueprint = blueprintFor(subjectId, week.weekNumber)

  return (
    <a
      href={`#/plan/${week.id}`}
      aria-label={`Open Week ${week.weekNumber}: ${week.title}`}
      className={cn(
        'card card-hover group relative block overflow-hidden p-3.5',
        active && 'ring-1 ring-accent/50',
        status === 'locked' && 'opacity-90',
      )}
    >
      {active ? (
        <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: 'var(--accent)' }} aria-hidden />
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span
            className={cn(
              'display flex-none text-[17px] leading-none font-medium',
              status === 'mastered' ? 'text-good' : status === 'locked' ? 'text-t3' : 'text-accent-strong',
            )}
            aria-hidden
          >
            {String(week.weekNumber).padStart(2, '0')}
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <WeekBadge status={status} />
            {active ? <Badge tone="accent">Current</Badge> : null}
            {week.capstone ? <Badge tone="warn">Capstone</Badge> : null}
            <span className="faint text-[11px]">
              {doneTasks} of {week.checklist.length} tasks
            </span>
          </div>
        </div>
      </div>

      <h3 className="mt-1.5 line-clamp-2 text-[13.5px] leading-snug font-semibold">{week.title}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="faint num text-[11px]">
          {formatTotal(summary.planned)} planned, {formatTotal(summary.done)} done
        </span>
        {overloaded > 0 ? (
          <Badge tone="warn" icon={<AlertTriangle size={10} />}>
            {overloaded} day{overloaded === 1 ? '' : 's'} over
          </Badge>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <ProgressBar
          value={ratio}
          tone={week.gate.passedAt ? 'good' : 'accent'}
          className="flex-1 !h-1.5"
          label={`Week ${week.weekNumber} estimate done`}
        />
        <span className="faint num text-[11px]">{percent(ratio)}%</span>
      </div>

      <div className="mt-2 border-t border-line pt-2">
        <span className="faint block truncate text-[11px]">
          {status === 'mastered'
            ? `Checkpoint cleared, ${formatTotal(summary.done)} credited`
            : (blueprint?.project ?? week.bookFocus)}
        </span>
      </div>
    </a>
  )
}

function CapacityEditor() {
  return (
    <section className="card mt-4 p-3.5" aria-labelledby="capacity-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Your real week</p>
          <h2 id="capacity-heading" className="h2 mt-0.5">
            Weekly capacity
          </h2>
          <p className="faint mt-0.5 text-[11px]">
            Hours you can actually protect. Plan warnings use these numbers.
          </p>
        </div>
      </div>
      <CapacitySliders className="mt-2.5" />
      <p className="faint mt-2 border-t border-line pt-2 text-[11px]">
        Capacity is stored on this device and is not overwritten by an imported backup.
      </p>
    </section>
  )
}

function PlanStat({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div>
      <p className="eyebrow truncate">{label}</p>
      <p className="num mt-1 text-[19px] leading-none font-semibold">{value}</p>
      <p className="faint mt-1 text-[11px]">{meta}</p>
    </div>
  )
}
