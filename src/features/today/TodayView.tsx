import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Layers,
  Palette,
  Pause,
  Play,
} from 'lucide-react'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
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
import { formatShortDate } from '../../lib/dates'
import {
  consistency,
  courseDay,
  courseWeek,
  daySlot,
  isPaused,
} from '../../lib/courseClock'
import { cn, percent } from '../../lib/utils'
import {
  Badge,
  Button,
  CheckRow,
  EmptyState,
  ProgressBar,
  WeekBadge,
} from '../../components/ui/primitives'
import { DAY_SLOTS, dayName, modeLabel, shortDayName } from '../plan/dayPlan'
import { paragraphs } from '../../content/style'

const COURSE_DAYS = 168

export function TodayView() {
  const subject = useActiveSubject()
  const overrides = useAppStore((state) => state.overrides)
  const planner = useAppStore((state) => state.planner)
  const journey = useAppStore((state) => state.journey)
  const dayPlans = useAppStore((state) => state.dayPlans)
  const dailyLog = useAppStore((state) => state.dailyLog)
  const toggleChecklist = useAppStore((state) => state.toggleChecklist)
  const pauseCourse = useAppStore((state) => state.pauseCourse)
  const resumeCourse = useAppStore((state) => state.resumeCourse)
  const toast = useUiStore((state) => state.toast)

  const clockDay = courseDay(journey)
  const clockWeek = clockDay === null ? null : courseWeek(clockDay)
  const slot = clockDay === null ? null : daySlot(clockDay)
  const week =
    clockWeek === null
      ? undefined
      : subject.weeks.find((entry) => entry.weekNumber === clockWeek)
  const summary = useMemo(
    () => (week ? summariseWeek(week, planner, journey.startWeekday) : null),
    [week, planner, journey.startWeekday],
  )
  const course = useMemo(() => summariseSubject(subject), [subject])
  const due = useMemo(() => dueCards(subject.cards).length, [subject.cards])
  const stats = useMemo(
    () => consistency(journey, dailyLog, [subject]),
    [journey, dailyLog, subject],
  )
  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
  )

  const paused = isPaused(journey)
  const openPause = journey.pauses.find((entry) => entry.to === null)

  const daysSinceActivity = useMemo(() => {
    // Find the most recent doneAt timestamp from checklist items
    const allDoneAts = subject.weeks
      .flatMap((w) => w.checklist)
      .filter((item) => item.done && item.doneAt)
      .map((item) => item.doneAt!)
      .sort((a, b) => b - a)

    if (allDoneAts.length === 0) return null

    const lastActivity = allDoneAts[0]!
    const now = Date.now()
    const daysDiff = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24))
    return daysDiff
  }, [subject])

  const showPauseNudge = !paused && daysSinceActivity !== null && daysSinceActivity >= 2

  const setPause = () => {
    const result = paused ? resumeCourse() : pauseCourse()
    toast(result.message, result.ok ? 'success' : 'error', 3200)
  }

  if (clockDay === null || slot === null) {
    return (
      <div>
        <header>
          <p className="eyebrow">Today</p>
          <h1 className="h1 mt-1">The course has not started</h1>
          <p className="muted mt-1 max-w-[60ch] text-[13px]">
            Day 1 begins when you press Start. Read the Day 0 guide first, then set the hours your week can hold.
          </p>
        </header>
        <div className="card mt-4">
          <EmptyState
            icon={<CalendarDays size={18} />}
            title="Start the clock when you are ready"
            description="The course is 168 days. Pausing freezes the day count, so a missed week does not throw you forward."
            action={
              <Button variant="primary" onClick={() => navigate('#/start')}>
                Open Day 0
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  if (!week || !summary) {
    const finished = clockDay > COURSE_DAYS
    return (
      <div>
        <header>
          <p className="eyebrow">{todayLabel}</p>
          <h1 className="h1 mt-1">{finished ? 'One hundred and sixty-eight days' : `Day ${clockDay}`}</h1>
        </header>
        <div className="card mt-4">
          <EmptyState
            icon={<Layers size={18} />}
            title={finished ? 'The six months are done' : `Week ${clockWeek} is not in this track`}
            description={
              finished
                ? 'The clock has reached the end of the plan. The work is yours now: keep the habits, and keep shipping.'
                : 'The next course week has not been added to this track yet. Open the plan to add it.'
            }
            action={
              <Button
                variant="primary"
                onClick={() => navigate(finished ? '#/progress' : '#/plan')}
              >
                {finished ? 'Open progress' : 'Open the plan'}
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  const status = weekStatus(week, subject.weeks, overrides)
  const todaySummary = summary.days.find((entry) => entry.slot === slot)!
  const todayItems = todaySummary.items
  const todayLeft = sumItems(todayItems.filter((item) => !item.done))
  const todayDone = todayItems.filter((item) => item.done).length
  const nextTask =
    todayItems.find((item) => !item.done) ?? week.checklist.find((item) => !item.done)
  const nextIsToday = nextTask ? nextTask.day === slot : false
  const phase = subject.phases.find((entry) => entry.id === week.phaseId)
  const overBy = todaySummary.overBy.active + todaySummary.overBy.passive
  const weekRatio = summary.planned.max > 0 ? summary.done.max / summary.planned.max : 0
  const courseRatio = course.items > 0 ? course.doneItems / course.items : 0
  const plan = dayPlans[week.id]?.find((entry) => entry.day === slot)
  const planParagraphs = plan ? paragraphs(plan.summary) : []
  const lead = planParagraphs[0]
  const rest = planParagraphs.slice(1)

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
          <h1 className="h1 mt-1.5">
            Day {clockDay} <span className="faint font-normal">of {COURSE_DAYS}</span>
          </h1>
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
          <Button
            variant={paused ? 'primary' : 'ghost'}
            size="sm"
            icon={paused ? <Play size={14} /> : <Pause size={14} />}
            onClick={setPause}
          >
            {paused ? 'Resume course' : 'Pause course'}
          </Button>
        </div>
      </header>

      {showPauseNudge && (
        <section
          className="mt-4 flex flex-col gap-2 rounded-xl border border-line bg-s2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Pause suggestion"
        >
          <div>
            <p className="text-[12.5px] font-semibold">
              Day {clockDay} · {daysSinceActivity} days off
            </p>
            <p className="faint mt-0.5 text-[11.5px]">
              If you need a break, pausing freezes the course day until you're ready.
            </p>
          </div>
          <Button variant="primary" size="sm" icon={<Pause size={14} />} onClick={setPause} className="flex-none">
            Pause until I'm back
          </Button>
        </section>
      )}

      {paused ? (
        <section
          className="mt-4 flex flex-col gap-2 rounded-xl border border-line bg-s2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Course paused"
        >
          <div>
            <p className="text-[12.5px] font-semibold">
              Paused{openPause ? ` since ${formatShortDate(openPause.from)}` : ''}
            </p>
            <p className="faint mt-0.5 text-[11.5px]">
              The course day stays on Day {clockDay}. It does not move until you resume.
            </p>
          </div>
          <Button variant="primary" size="sm" icon={<Play size={14} />} onClick={setPause} className="flex-none">
            Resume course
          </Button>
        </section>
      ) : null}

      {nextTask ? (
        <section className="mt-7 border-l-[3px] border-accent pl-4 sm:pl-5" aria-label="Up next">
          <p className="eyebrow">Up next</p>
          <p className="display mt-1.5 max-w-[46ch] text-[clamp(1.3rem,1.05rem+0.9vw,1.7rem)] leading-[1.15] font-medium">
            {nextTask.label}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="muted flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
              <span>{nextIsToday ? 'For today' : `Day ${nextTask.day} this week`}</span>
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

      {plan ? (
        <section className="card mt-4 p-3.5 sm:p-4" aria-labelledby="day-card-heading">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="eyebrow">Day {slot} lesson</p>
              <h2 id="day-card-heading" className="h2 mt-0.5">
                {plan.title}
              </h2>
            </div>
            <span className="faint num flex-none text-[11.5px]">{plan.estMinutes} min</span>
          </div>

          {lead ? (
            <p className="muted mt-2 max-w-[68ch] text-[13px] leading-relaxed">{lead}</p>
          ) : null}

          {rest.length > 0 ? (
            <details className="group mt-2">
              <summary className="link inline-flex cursor-pointer items-center gap-1 text-[11.5px]">
                Read the mechanism and the trap
                <ArrowRight
                  size={11}
                  className="transition group-open:rotate-90"
                  aria-hidden
                />
              </summary>
              <div className="mt-2 max-w-[68ch] space-y-2">
                {rest.map((paragraph, index) => (
                  <p key={index} className="muted text-[13px] leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </details>
          ) : null}

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-s2 p-2.5">
              <p className="eyebrow">Do this, not that</p>
              <p className="mt-1 text-[12px] leading-relaxed">{plan.direction}</p>
            </div>
            <div className="rounded-lg border border-accent/20 bg-accent-soft/60 p-2.5">
              <p className="eyebrow flex items-center gap-1.5">
                <Palette size={11} aria-hidden /> Design note
              </p>
              <p className="mt-1 text-[12px] leading-relaxed">{plan.designNote}</p>
            </div>
          </div>

          {plan.resources.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {plan.resources.map((resource) =>
                resource.url ? (
                  <a
                    key={resource.label}
                    className="link text-[11.5px]"
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {resource.label}
                  </a>
                ) : (
                  <span key={resource.label} className="faint text-[11.5px]">
                    {resource.label}
                  </span>
                ),
              )}
            </div>
          ) : null}

          <p className="faint mt-2.5 border-t border-line pt-2 text-[11px]">
            The card explains the day. The checklist below is the evidence; only a checked task earns credit.
          </p>
        </section>
      ) : (
        <section className="card mt-4 p-3.5" aria-label="Day card not written yet">
          <p className="text-[12.5px] font-semibold">This week has no day card yet</p>
          <p className="faint mt-0.5 max-w-[62ch] text-[11.5px] leading-relaxed">
            Work from the checklist. The blueprint still names the week's idea, project and checkpoint, so the day is
            not empty.
          </p>
        </section>
      )}

      {slot === 5 && week.weekNumber < 24 && !dayPlans[subject.weeks.find(w => w.weekNumber === week.weekNumber + 1)?.id || ''] && (
        <section className="card mt-4 border-l-[3px] border-accent p-3.5 sm:p-4" aria-label="Prepare next week">
          <div className="flex items-start gap-3">
            <div className="flex-none grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-accent">
              <CalendarDays size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Day {slot} checkpoint</p>
              <h3 className="mt-0.5 text-[13px] font-semibold">Prepare Week {week.weekNumber + 1}</h3>
              <p className="faint mt-1 text-[12px] leading-relaxed">
                You're on Day 5. Next week starts in two days, but it has no day cards yet. Write them now so you're ready when Monday arrives.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ArrowRight size={13} />}
                  onClick={() => {
                    const nextWeek = subject.weeks.find(w => w.weekNumber === week.weekNumber + 1)
                    if (nextWeek) navigate(`#/plan/${nextWeek.id}`)
                  }}
                >
                  Write next week
                </Button>
                <span className="faint text-[11px]">Takes about 2 minutes</span>
              </div>
            </div>
          </div>
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
          label="Consistency"
          value={`${percent(stats.ratio)}%`}
          meta={`${stats.kept} of ${stats.elapsed} day${stats.elapsed === 1 ? '' : 's'} with evidence`}
          tone={stats.ratio >= 0.8 ? 'good' : undefined}
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
              <p className="eyebrow">
                Day {slot}, {dayName(todaySummary.weekday)}
              </p>
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
                Over today's budget by {overBy} min. Spread a task to another day.
              </span>
            ) : null}
          </div>

          {todayItems.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-line px-3 py-5 text-center">
              <p className="text-[12.5px] font-medium">
                No tasks scheduled for Day {slot}
              </p>
              <p className="faint mt-1 text-[11.5px]">
                Use the buffer, review a few cards, or pick the next unfinished task from the week.
              </p>
              {plan && plan.tasks.length > 0 ? (
                <ul className="mx-auto mt-2 max-w-[46ch] space-y-1 text-left">
                  {plan.tasks.map((task) => (
                    <li key={task} className="text-[12px] leading-snug">
                      {task}
                    </li>
                  ))}
                </ul>
              ) : null}
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
              {DAY_SLOTS.map((entrySlot) => {
                const daySummary = summary.days.find((entry) => entry.slot === entrySlot)!
                const done = daySummary.items.filter((item) => item.done).length
                const total = daySummary.items.length
                const ratio = total > 0 ? done / total : 0
                const isToday = entrySlot === slot
                return (
                  <button
                    key={entrySlot}
                    type="button"
                    onClick={() => navigate(`#/plan/${week.id}`)}
                    aria-label={`Day ${entrySlot}, ${dayName(daySummary.weekday)}, ${done} of ${total} done`}
                    aria-current={isToday ? 'date' : undefined}
                    className={cn(
                      'min-w-0 px-0.5 pt-1.5 pb-2 text-center transition',
                      isToday ? 'bg-accent-soft' : 'bg-s1 hover:bg-s2',
                    )}
                  >
                    <span
                      className={cn(
                        'block truncate text-[10.5px]',
                        isToday ? 'text-accent-strong' : 'text-t3',
                      )}
                    >
                      Day {entrySlot}
                    </span>
                    <span className="faint mt-0.5 block truncate text-[10px]">
                      {shortDayName(daySummary.weekday)}
                    </span>
                    <span className="num mt-0.5 block text-[11.5px] font-semibold">
                      {done}/{total}
                    </span>
                    <span className="mt-1 block h-[3px] overflow-hidden bg-s3">
                      <span
                        className="block h-full"
                        style={{
                          width: `${percent(ratio)}%`,
                          background: isToday ? 'var(--accent)' : 'var(--good)',
                        }}
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
            <a href="#/start" className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-s2">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-s2 text-t2">
                <CalendarDays size={14} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium">Course</span>
                <span className="faint block text-[11.5px]">
                  Day {clockDay} of {COURSE_DAYS}, pause and capacity
                </span>
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
