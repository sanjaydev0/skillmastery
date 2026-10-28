import { useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Layers,
  TrendingUp,
} from 'lucide-react'
import type { Phase, PlannerSettings, Week } from '../../types/schema'
import { useActiveSubject, useActiveWeek, useAppStore } from '../../store/AppStore'
import { weekStatus } from '../../engine/gating'
import { formatTotal, summariseSubject, summariseWeek } from '../../engine/estimates'
import { minutesLabel } from '../../lib/dates'
import { cn, percent } from '../../lib/utils'
import { navigate } from '../../lib/router'
import { Badge, Button, ProgressBar, WeekBadge } from '../../components/ui/primitives'

export function PlanView() {
  const subject = useActiveSubject()
  const active = useActiveWeek()
  const overrides = useAppStore((state) => state.overrides)
  const planner = useAppStore((state) => state.planner)

  const orderedWeeks = useMemo(
    () => [...subject.weeks].sort((a, b) => a.weekNumber - b.weekNumber),
    [subject.weeks],
  )
  const course = useMemo(() => summariseSubject(subject), [subject])
  const summaries = useMemo(
    () => new Map(orderedWeeks.map((week) => [week.id, summariseWeek(week, planner)])),
    [orderedWeeks, planner],
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

      <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Plan totals">
        <PlanStat
          label="Weeks"
          value={String(orderedWeeks.length)}
          meta={`${cleared} checkpoints cleared`}
          icon={<Layers size={13} />}
        />
        <PlanStat
          label="Planned"
          value={formatTotal(course.planned)}
          meta={`${course.items} tasks in total`}
          icon={<Clock3 size={13} />}
        />
        <PlanStat
          label="Completed"
          value={formatTotal(course.done)}
          meta={`${course.doneItems}/${course.items} tasks checked`}
          icon={<CheckCircle2 size={13} />}
        />
        <PlanStat
          label="Remaining"
          value={formatTotal(course.remaining)}
          meta="Estimate range, not a countdown"
          icon={<TrendingUp size={13} />}
        />
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
        <span className="faint num text-[10.5px]">
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
  week,
  active,
  status,
  summary,
}: {
  week: Week
  active: boolean
  status: ReturnType<typeof weekStatus>
  summary: ReturnType<typeof summariseWeek>
}) {
  const ratio = summary.planned.max > 0 ? summary.done.max / summary.planned.max : 0
  const overloaded = summary.overloadedDays.length
  const doneTasks = week.checklist.filter((item) => item.done).length

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
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'num grid h-9 w-9 flex-none place-items-center rounded-lg border text-[12px] font-bold',
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
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1">
              <WeekBadge status={status} />
              {active ? <Badge tone="accent">Current</Badge> : null}
              {week.capstone ? <Badge tone="warn">Capstone</Badge> : null}
            </div>
            <p className="faint mt-0.5 text-[10px]">
              {doneTasks}/{week.checklist.length} tasks · {week.checklist.length === 7 ? 'one per day' : 'day plan'}
            </p>
          </div>
        </div>
        <ArrowRight
          size={15}
          className="mt-1 flex-none text-t3 transition group-hover:translate-x-0.5 group-hover:text-accent"
          aria-hidden
        />
      </div>

      <h3 className="mt-2 line-clamp-2 text-[13.5px] leading-snug font-semibold">{week.title}</h3>

      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        <span className="pill !py-0.5 !text-[9.5px]">Plan {formatTotal(summary.planned)}</span>
        <span className="pill !py-0.5 !text-[9.5px]">Done {formatTotal(summary.done)}</span>
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
        <span className="faint num text-[9.5px]">{percent(ratio)}%</span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className="faint truncate text-[10px]">
          {status === 'mastered'
            ? `Checkpoint cleared · ${formatTotal(summary.done)} credited`
            : week.bookFocus}
        </span>
        <ChevronRight size={12} className="flex-none text-t3" aria-hidden />
      </div>
    </a>
  )
}

type CapacityKey =
  | 'weekdayActiveMinutes'
  | 'weekdayPassiveMinutes'
  | 'weekendActiveMinutes'
  | 'weekendPassiveMinutes'

const CAPACITY_FIELDS: { key: CapacityKey; label: string; hint: string }[] = [
  { key: 'weekdayActiveMinutes', label: 'Weekday active', hint: 'Mon–Fri building and debugging' },
  { key: 'weekdayPassiveMinutes', label: 'Weekday passive', hint: 'Mon–Fri reading and notes' },
  { key: 'weekendActiveMinutes', label: 'Weekend active', hint: 'Sat–Sun building and testing' },
  { key: 'weekendPassiveMinutes', label: 'Weekend passive', hint: 'Sat–Sun reading and review' },
]

function CapacityEditor() {
  const planner = useAppStore((state) => state.planner)
  const updatePlanner = useAppStore((state) => state.updatePlanner)
  const weekdayTotal = planner.weekdayActiveMinutes + planner.weekdayPassiveMinutes
  const weekendTotal = planner.weekendActiveMinutes + planner.weekendPassiveMinutes

  const setValue = (key: CapacityKey, raw: string) => {
    updatePlanner({ [key]: Number(raw) } as Partial<PlannerSettings>)
  }

  return (
    <section className="card mt-4 p-3.5" aria-labelledby="capacity-heading">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="eyebrow">Your real week</p>
          <h2 id="capacity-heading" className="h2 mt-0.5">
            Daily capacity
          </h2>
          <p className="faint mt-0.5 text-[11px]">
            Minutes per day, not a target. Plan overload warnings use these numbers.
          </p>
        </div>
        <p className="faint num text-[10.5px]">
          Weekday {minutesLabel(weekdayTotal)} · Weekend {minutesLabel(weekendTotal)}
        </p>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CAPACITY_FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="label">{field.label}</span>
            <span className="flex items-center gap-1.5">
              <input
                className="input num !h-8 !px-2 !text-[12px]"
                type="number"
                min={0}
                max={720}
                step={5}
                inputMode="numeric"
                value={planner[field.key]}
                onChange={(event) => setValue(field.key, event.target.value)}
                aria-label={`${field.label} minutes per day`}
              />
              <span className="faint text-[10.5px]">min</span>
            </span>
            <span className="faint mt-1 block text-[9.5px] leading-snug">{field.hint}</span>
          </label>
        ))}
      </div>
      <p className="faint mt-2 border-t border-line pt-2 text-[10px]">
        Sunday is the buffer day. Capacity is stored on this device and is not overwritten by an imported backup.
      </p>
    </section>
  )
}

function PlanStat({
  label,
  value,
  meta,
  icon,
}: {
  label: string
  value: string
  meta: string
  icon: ReactNode
}) {
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
