import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Layers,
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
          <h1 className="h1 mt-1.5">Today</h1>
          <p className="muted mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <span className="font-medium text-t1">
              Week {week.weekNumber}, {week.title}
            </span>
            <WeekBadge status={status} />
            {phase ? <span className="faint">{phase.name.replace(/^Phase \d+ · /, '')}</span> : null}
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
          <Button variant="outline" size="sm" icon={<BrainCircuit size={14} />} onClick={() => navigate('#/practice')}>
            Review {due > 0 ? `(${due})` : ''}
          </Button>
        </div>
      </header>

      {nextTask ? (
        <section className="mt-7 border-l-[3px] border-accent pl-4 sm:pl-5" aria-label="Up next">
          <p className="eyebrow">Up next</p>
          <p className="display mt-1.5 max-w-[46ch] text-[clamp(1.3rem,1.05rem+0.9vw,1.7rem)] leading-[1.15] font-medium">
            {nextTask.label}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="muted flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
              <span>{nextIsToday ? 'For today' : `${dayName(nextTask.day ?? today)} this week`}</span>
              <span>{modeLabel(nextTask.context)}</span>
              <span className="num">{formatEstimate(estimateOf(nextTask))}</span>
            </p>
            <Button
              variant="primary"
              icon={<CheckCircle2 size={15} />}
              onClick={() => completeTask(nextTask.id)}
              className="ml-auto flex-none"
            >
              Mark done
            </Button>
          </div>
          <p className="faint mt-2.5 text-[11.5px]">
            {nextIsToday
              ? 'Finishing this credits its estimate to today and the course total.'
              : 'Nothing left today. This is the next unfinished task in the week.'}{' '}
            <a className="link" href={`#/plan/${week.id}`}>
              See all seven days
            </a>
          </p>
        </section>
      ) : (
        <section className="mt-7 border-l-[3px] border-good pl-4 sm:pl-5">
          <p className="eyebrow">Week {week.weekNumber}</p>
          <p className="display mt-1.5 text-[1.35rem] leading-snug font-medium">
            Every task in this week is checked
          </p>
          <p className="muted mt-2 max-w-[62ch] text-[12.5px]">
            The week's estimate is fully credited. Clear the checkpoint when you can rebuild the work without notes,
            then the next week unlocks.
          </p>
          <Button
            variant="soft"
            size="sm"
            className="mt-3"
            icon={<ArrowRight size={13} />}
            onClick={() => navigate(`#/plan/${week.id}`)}
          >
            Open the checkpoint
          </Button>
        </section>
      )}

      <section className="ledger mt-6" aria-label="Today at a glance">
        <LedgerFact
          label="Left today"
          value={todayItems.length > 0 && todayItems.every((item) => item.done) ? 'Done' : formatTotal(todayLeft)}
          meta={`${todayDone} of ${todayItems.length} tasks checked`}
          tone={todayItems.length > 0 && todayItems.every((item) => item.done) ? 'good' : undefined}
        />
        <LedgerFact
          label="This week"
          value={formatTotal(summary.done)}
          meta={`of ${formatTotal(summary.planned)} completed`}
        />
        <LedgerFact
          label="Reviews due"
          value={String(due)}
          meta={due === 0 ? 'Nothing waiting' : 'Cards ready to recall'}
          tone={due > 0 ? 'accent' : undefined}
        />
        <LedgerFact
          label="Course"
          value={`${percent(courseRatio)}%`}
          meta={`${course.doneItems} of ${course.items} tasks`}
        />
      </section>

      <div className="mt-4 grid items-start gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section className="card p-3.5 sm:p-4" aria-labelledby="today-plan-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">{dayName(today)}, day {dayNumber(today)}</p>
              <h2 id="today-plan-heading" className="h2 mt-0.5">
                Today's plan
              </h2>
            </div>
            <span className="faint num text-[11.5px]">
              {formatTotal(todayLeft)} left, active and passive
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
              <span className="text-[11.5px] text-warn">
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
                  meta={`${modeLabel(item.context)}, ${formatEstimate(estimateOf(item))}`}
                />
              ))}
            </div>
          )}

          <div className="mt-3 border-t border-line pt-2.5">
            <div className="flex items-center gap-2">
              <ProgressBar value={weekRatio} className="flex-1 !h-1.5" label={`Week ${week.weekNumber} estimate done`} />
              <span className="faint num text-[11px]">
                {formatTotal(summary.done)} / {formatTotal(summary.planned)}
              </span>
            </div>
            <p className="faint mt-1.5 text-[11.5px]">
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
            <div className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-[6px] border border-line bg-line">
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
                      'min-w-0 px-1 pt-1.5 pb-2 text-center transition',
                      isToday ? 'bg-accent-soft' : 'bg-s1 hover:bg-s2',
                    )}
                  >
                    <span className={cn('block truncate text-[11.5px]', isToday ? 'text-accent-strong' : 'text-t3')}>
                      {shortDayName(day)}
                    </span>
                    <span className="num mt-0.5 block text-[12px] font-semibold">{done}/{total}</span>
                    <span className="mt-1.5 block h-[3px] overflow-hidden bg-s3">
                      <span
                        className="block h-full"
                        style={{ width: `${percent(ratio)}%`, background: isToday ? 'var(--accent)' : 'var(--good)' }}
                      />
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="faint text-[11px]">
                {summary.overloadedDays.length > 0
                  ? `${summary.overloadedDays.length} day${summary.overloadedDays.length === 1 ? '' : 's'} over capacity`
                  : 'Every day fits your capacity'}
              </span>
              <span className="faint num text-[11px]">
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
                <span className="faint block text-[11.5px]">
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
                <span className="faint block text-[11.5px]">Docs, books and saved links</span>
              </span>
              <ArrowRight size={13} className="flex-none text-t3" aria-hidden />
            </a>
            <a href="#/progress" className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-s2">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-s2 text-t2">
                <Layers size={14} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium">Progress</span>
                <span className="faint block text-[11.5px]">Course totals and checkpoints</span>
              </span>
              <ArrowRight size={13} className="flex-none text-t3" aria-hidden />
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}

function LedgerFact({
  label,
  value,
  meta,
  tone,
}: {
  label: string
  value: string
  meta: string
  tone?: 'good' | 'accent'
}) {
  return (
    <div>
      <p className="eyebrow truncate">{label}</p>
      <p
        className={cn(
          'num mt-1 text-[19px] leading-none font-semibold',
          tone === 'good' ? 'text-good' : tone === 'accent' ? 'text-accent' : 'text-t1',
        )}
      >
        {value}
      </p>
      <p className="faint mt-1 text-[11px]">{meta}</p>
    </div>
  )
}
