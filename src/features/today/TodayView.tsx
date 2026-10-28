import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Layers,
  TrendingUp,
} from 'lucide-react'
import { useActiveSubject, useActiveWeek, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import {
  estimateOf,
  formatEstimate,
  formatTotal,
  summariseSubject,
  summariseWeek,
  sumItems,
} from '../../engine/estimates'
import { dueCards } from '../../engine/srs'
import { weekStatus } from '../../engine/gating'
import { navigate } from '../../lib/router'
import { schemaWeekday } from '../../lib/dates'
import { cn, percent } from '../../lib/utils'
import {
  Badge,
  Button,
  CheckRow,
  EmptyState,
  ProgressBar,
  WeekBadge,
} from '../../components/ui/primitives'
import { MONDAY_FIRST, dayName, dayNumber, modeLabel, shortDayName } from '../plan/dayPlan'

export function TodayView() {
  const subject = useActiveSubject()
  const week = useActiveWeek()
  const overrides = useAppStore((state) => state.overrides)
  const planner = useAppStore((state) => state.planner)
  const toggleChecklist = useAppStore((state) => state.toggleChecklist)
  const toast = useUiStore((state) => state.toast)

  const today = schemaWeekday()
  const summary = useMemo(
    () => (week ? summariseWeek(week, planner) : null),
    [week, planner],
  )
  const course = useMemo(() => summariseSubject(subject), [subject])
  const due = useMemo(() => dueCards(subject.cards).length, [subject.cards])
  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
  )

  if (!week || !summary) {
    return (
      <div>
        <header>
          <p className="eyebrow">Today</p>
          <h1 className="h1 mt-1">Nothing planned yet</h1>
          <p className="muted mt-1 text-[13px]">Add a week to this track, then its days will appear here.</p>
        </header>
        <div className="card mt-4">
          <EmptyState
            icon={<CalendarDays size={18} />}
            title="This track has no weeks"
            description="A week holds seven day plans. Create the first one to start the schedule."
            action={
              <Button variant="primary" onClick={() => navigate('#/plan')}>
                Open the plan
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  const status = weekStatus(week, subject.weeks, overrides)
  const todaySummary = summary.days.find((entry) => entry.day === today)!
  const todayItems = todaySummary.items
  const todayLeft = sumItems(todayItems.filter((item) => !item.done))
  const todayDone = todayItems.filter((item) => item.done).length
  const nextTask = todayItems.find((item) => !item.done) ?? week.checklist.find((item) => !item.done)
  const nextIsToday = nextTask ? nextTask.day === today : false
  const phase = subject.phases.find((entry) => entry.id === week.phaseId)
  const overBy = todaySummary.overBy.active + todaySummary.overBy.passive
  const weekRatio = summary.planned.max > 0 ? summary.done.max / summary.planned.max : 0
  const courseRatio = course.items > 0 ? course.doneItems / course.items : 0

  const completeTask = (taskId: string) => {
    const task = week.checklist.find((item) => item.id === taskId)
    if (!task) return
    toggleChecklist(week.id, taskId)
    toast(
      task.done
        ? `Unchecked. ${formatEstimate(estimateOf(task))} removed from your completed estimate.`
        : `Done. ${formatEstimate(estimateOf(task))} added to your completed estimate.`,
      task.done ? 'info' : 'success',
      3200,
    )
  }

  return (
    <div>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">{todayLabel}</p>
          <h1 className="h1 mt-1">Today</h1>
          <p className="muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <span className="font-medium text-t1">
              Week {week.weekNumber} · {week.title}
            </span>
            <WeekBadge status={status} />
            {phase ? <span className="faint">· {phase.name.replace(/^Phase \d+ · /, '')}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<CalendarDays size={14} />}
            onClick={() => navigate(`#/plan/${week.id}`)}
          >
            This week's plan
          </Button>
          <Button variant="primary" size="sm" icon={<BrainCircuit size={14} />} onClick={() => navigate('#/practice')}>
            Review {due > 0 ? `(${due})` : ''}
          </Button>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Today at a glance">
        <MiniStat
          label="Left today"
          value={todayItems.length > 0 && todayItems.every((item) => item.done) ? 'Done' : formatTotal(todayLeft)}
          meta={`${todayDone}/${todayItems.length} tasks done`}
          icon={<Clock3 size={13} />}
          tone={todayItems.length > 0 && todayItems.every((item) => item.done) ? 'good' : 'neutral'}
        />
        <MiniStat
          label="This week"
          value={formatTotal(summary.done)}
          meta={`of ${formatTotal(summary.planned)} completed`}
          icon={<CheckCircle2 size={13} />}
        />
        <MiniStat
          label="Reviews due"
          value={String(due)}
          meta={due === 0 ? 'Nothing waiting' : 'Cards ready to recall'}
          icon={<BrainCircuit size={13} />}
          tone={due > 0 ? 'accent' : 'neutral'}
        />
        <MiniStat
          label="Course"
          value={`${percent(courseRatio)}%`}
          meta={`${course.doneItems}/${course.items} tasks`}
          icon={<TrendingUp size={13} />}
        />
      </section>

      {nextTask ? (
        <section className="card mt-4 overflow-hidden" aria-label="Up next">
          <div className="flex flex-col gap-3 border-b border-line bg-accent-soft/40 p-3.5 sm:flex-row sm:items-center sm:p-4">
            <div className="min-w-0 flex-1">
              <p className="eyebrow flex items-center gap-1.5">
                <ArrowRight size={12} aria-hidden /> Up next
              </p>
              <p className="mt-1 text-[14.5px] leading-snug font-semibold">{nextTask.label}</p>
              <p className="muted mt-1 flex flex-wrap items-center gap-x-1.5 text-[11.5px]">
                <span>{nextIsToday ? 'Scheduled for today' : `${dayName(nextTask.day ?? today)} of this week`}</span>
                <span className="faint">·</span>
                <span>{modeLabel(nextTask.context)}</span>
                <span className="faint">·</span>
                <span className="num">{formatEstimate(estimateOf(nextTask))}</span>
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle2 size={14} />}
              onClick={() => completeTask(nextTask.id)}
              className="flex-none"
            >
              Mark done
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-[11px] sm:px-4">
            <span className="faint">
              {nextIsToday
                ? 'Finishing this credits its estimate to today and the course total.'
                : 'Nothing left today — this is the next unfinished task in the week.'}
            </span>
            <a className="link" href={`#/plan/${week.id}`}>
              See all seven days →
            </a>
          </div>
        </section>
      ) : (
        <section className="card mt-4 p-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg bg-good-soft text-good">
              <CheckCircle2 size={17} aria-hidden />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold">Every task in Week {week.weekNumber} is checked</p>
              <p className="muted mt-1 text-[12.5px]">
                The week's estimate is fully credited. Clear the checkpoint when you can rebuild the work without
                notes, then the next week unlocks.
              </p>
              <Button
                variant="soft"
                size="sm"
                className="mt-2.5"
                icon={<ArrowRight size={13} />}
                onClick={() => navigate(`#/plan/${week.id}`)}
              >
                Open the checkpoint
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="mt-4 grid items-start gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section className="card p-3.5 sm:p-4" aria-labelledby="today-plan-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Day {dayNumber(today)} · {dayName(today)}</p>
              <h2 id="today-plan-heading" className="h2 mt-0.5">
                Today's plan
              </h2>
            </div>
            <span className="faint num text-[10.5px]">
              {formatTotal(todayLeft)} left · active + passive
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={todaySummary.overBy.active > 0 ? 'warn' : 'neutral'}>
              Active {todaySummary.activeMinutes}/{todaySummary.capacity.active} min
            </Badge>
            <Badge tone={todaySummary.overBy.passive > 0 ? 'warn' : 'neutral'}>
              Passive {todaySummary.passiveMinutes}/{todaySummary.capacity.passive} min
            </Badge>
            {overBy > 0 ? (
              <span className="text-[10.5px] text-warn">
                Over today's budget by {overBy} min — spread a task to another day.
              </span>
            ) : null}
          </div>

          {todayItems.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-line px-3 py-5 text-center">
              <p className="text-[12.5px] font-medium">No tasks scheduled for {dayName(today)}</p>
              <p className="faint mt-1 text-[11.5px]">
                Use the buffer, review a few cards, or pick the next unfinished task from the week.
              </p>
              <Button variant="soft" size="sm" className="mt-2.5" onClick={() => navigate(`#/plan/${week.id}`)}>
                Open the week
              </Button>
            </div>
          ) : (
            <div className="mt-2 space-y-0.5">
              {todayItems.map((item) => (
                <CheckRow
                  key={item.id}
                  checked={item.done}
                  onToggle={() => completeTask(item.id)}
                  label={item.label}
                  meta={`${modeLabel(item.context)} · ${formatEstimate(estimateOf(item))}`}
                />
              ))}
            </div>
          )}

          <div className="mt-3 border-t border-line pt-2.5">
            <div className="flex items-center gap-2">
              <ProgressBar value={weekRatio} className="flex-1 !h-1.5" label={`Week ${week.weekNumber} estimate done`} />
              <span className="faint num text-[10px]">
                {formatTotal(summary.done)} / {formatTotal(summary.planned)}
              </span>
            </div>
            <p className="faint mt-1.5 text-[10.5px]">
              Completing a task credits its full estimate range to the week and course totals.
            </p>
          </div>
        </section>

        <div className="space-y-3">
          <section className="card p-3.5" aria-labelledby="week-strip-heading">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="eyebrow">Week {week.weekNumber}</p>
                <h2 id="week-strip-heading" className="h2 mt-0.5">
                  Seven days
                </h2>
              </div>
              <a className="link text-[11px]" href={`#/plan/${week.id}`}>
                Open
              </a>
            </div>
            <div className="mt-2.5 grid grid-cols-7 gap-1">
              {MONDAY_FIRST.map((day) => {
                const daySummary = summary.days.find((entry) => entry.day === day)!
                const done = daySummary.items.filter((item) => item.done).length
                const total = daySummary.items.length
                const ratio = total > 0 ? done / total : 0
                const isToday = day === today
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => navigate(`#/plan/${week.id}`)}
                    aria-label={`Day ${dayNumber(day)} ${dayName(day)}, ${done} of ${total} done`}
                    aria-current={isToday ? 'date' : undefined}
                    className={cn(
                      'min-w-0 rounded-lg border p-1.5 text-center transition',
                      isToday
                        ? 'border-accent/50 bg-accent-soft text-accent-strong'
                        : 'border-line bg-s1 text-t2 hover:border-line-strong hover:bg-s2',
                    )}
                  >
                    <span className="block truncate text-[9px] font-semibold tracking-wide uppercase">
                      {shortDayName(day)}
                    </span>
                    <span className="num mt-0.5 block text-[11px] font-semibold">
                      {done}/{total}
                    </span>
                    <span className="mt-1 block h-1 overflow-hidden rounded-full bg-s3">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${percent(ratio)}%`, background: isToday ? 'var(--accent)' : 'var(--good)' }}
                      />
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="faint text-[10px]">
                {summary.overloadedDays.length > 0
                  ? `${summary.overloadedDays.length} day${summary.overloadedDays.length === 1 ? '' : 's'} over capacity`
                  : 'Every day fits your capacity'}
              </span>
              <span className="faint num text-[10px]">
                {summary.unassigned.length > 0 ? `${summary.unassigned.length} unscheduled` : ''}
              </span>
            </div>
          </section>

          <section className="card p-2" aria-label="Quick links">
            <a
              href="#/practice"
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-s2"
            >
              <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-s2 text-t2">
                <BrainCircuit size={14} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium">Practice</span>
                <span className="faint block text-[10.5px]">
                  {due > 0 ? `${due} card${due === 1 ? '' : 's'} due now` : 'No cards due'}
                </span>
              </span>
              <ArrowRight size={13} className="flex-none text-t3" aria-hidden />
            </a>
            <a href="#/library" className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-s2">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-s2 text-t2">
                <BookOpen size={14} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium">Library</span>
                <span className="faint block text-[10.5px]">Docs, books and saved links</span>
              </span>
              <ArrowRight size={13} className="flex-none text-t3" aria-hidden />
            </a>
            <a href="#/progress" className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-s2">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-s2 text-t2">
                <Layers size={14} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium">Progress</span>
                <span className="faint block text-[10.5px]">Course totals and checkpoints</span>
              </span>
              <ArrowRight size={13} className="flex-none text-t3" aria-hidden />
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  meta,
  icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  meta: string
  icon: ReactNode
  tone?: 'neutral' | 'good' | 'accent'
}) {
  return (
    <div className="card px-3 py-2.5">
      <div className="flex items-center justify-between gap-1.5">
        <span className="faint truncate text-[9.5px] font-semibold tracking-[0.1em] uppercase">{label}</span>
        <span
          className={cn(
            'flex-none',
            tone === 'good' ? 'text-good' : tone === 'accent' ? 'text-accent' : 'text-t3',
          )}
          aria-hidden
        >
          {icon}
        </span>
      </div>
      <p className="num mt-1.5 text-[15px] leading-none font-semibold">{value}</p>
      <p className="faint mt-1 truncate text-[10px]">{meta}</p>
    </div>
  )
}
