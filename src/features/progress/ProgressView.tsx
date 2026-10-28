import { useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Percent,
  Sparkles,
  Target,
} from 'lucide-react'
import type { Week } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { overallMastery, weekStatus } from '../../engine/gating'
import { formatTotal, summariseSubject, summariseWeek } from '../../engine/estimates'
import { dueCards } from '../../engine/srs'
import { percent } from '../../lib/utils'
import { navigate } from '../../lib/router'
import { Badge, Button, ProgressBar, ProgressRing, WeekBadge } from '../../components/ui/primitives'

export function ProgressView() {
  const subject = useActiveSubject()
  const overrides = useAppStore((state) => state.overrides)
  const planner = useAppStore((state) => state.planner)

  const course = useMemo(() => summariseSubject(subject), [subject])
  const mastered = subject.nodes.filter((node) => node.status === 'mastered').length
  const cleared = subject.weeks.filter((week) => week.gate.passedAt).length
  const due = useMemo(() => dueCards(subject.cards).length, [subject.cards])
  const taskRatio = course.items > 0 ? course.doneItems / course.items : 0
  const estimateRatio = course.planned.max > 0 ? course.done.max / course.planned.max : 0
  const orderedWeeks = useMemo(
    () => [...subject.weeks].sort((a, b) => a.weekNumber - b.weekNumber),
    [subject.weeks],
  )
  const summaries = useMemo(
    () => new Map(orderedWeeks.map((week) => [week.id, summariseWeek(week, planner)])),
    [orderedWeeks, planner],
  )

  return (
    <div>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Evidence, not vibes</p>
          <h1 className="h1 mt-1">Progress</h1>
          <p className="muted mt-1 max-w-2xl text-[13px]">
            Estimated ranges only. Checking a task credits its range; unchecking removes it. No timer runs in the
            background.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={<BrainCircuit size={14} />} onClick={() => navigate('#/practice')}>
            {due > 0 ? `Review ${due} due` : 'Practice'}
          </Button>
          <Button variant="primary" size="sm" icon={<Target size={14} />} onClick={() => navigate('#/plan')}>
            Open the plan
          </Button>
        </div>
      </header>

      <section className="card mt-4 p-4" aria-labelledby="course-progress-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-none items-center gap-3">
            <ProgressRing value={taskRatio} size={84} stroke={7} label={`${percent(taskRatio)}%`} sublabel="tasks" />
            <div>
              <p className="eyebrow">Course</p>
              <h2 id="course-progress-heading" className="h2 mt-0.5">
                {course.doneItems} of {course.items} tasks checked
              </h2>
              <p className="muted mt-0.5 text-[11.5px]">
                {course.weeks} weeks · {subject.phases.length} phases · {subject.shortName}
              </p>
            </div>
          </div>
          <div className="min-w-0 flex-1 sm:border-l sm:border-line sm:pl-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[12px] font-medium">
                <span className="num">{formatTotal(course.done)}</span>
                <span className="faint"> of </span>
                <span className="num">{formatTotal(course.planned)}</span>
                <span className="faint"> estimate completed</span>
              </p>
              <span className="faint num text-[10.5px]">{percent(estimateRatio)}%</span>
            </div>
            <ProgressBar value={estimateRatio} className="mt-2 !h-2" label="Course estimate completed" />
            <p className="faint mt-2 text-[10.5px]">
              {formatTotal(course.remaining)} of estimated work remains. Ranges come from each task, so they stay
              honest even when a task runs long.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Progress totals">
        <ProgressStat label="Completed" value={formatTotal(course.done)} meta="Credited estimate" icon={<CheckCircle2 size={13} />} />
        <ProgressStat label="Remaining" value={formatTotal(course.remaining)} meta="Planned minus done" icon={<Clock3 size={13} />} />
        <ProgressStat
          label="Checkpoints"
          value={`${cleared}/${orderedWeeks.length}`}
          meta="Cleared without notes"
          icon={<Sparkles size={13} />}
        />
        <ProgressStat
          label="Concepts"
          value={`${mastered}/${subject.nodes.length}`}
          meta={`${percent(overallMastery(subject.nodes))}% mastered`}
          icon={<Percent size={13} />}
        />
      </section>

      <section className="mt-4" aria-labelledby="phase-progress-heading">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
          <div>
            <p className="eyebrow">The whole route</p>
            <h2 id="phase-progress-heading" className="h2 mt-0.5">
              Phase and week progress
            </h2>
          </div>
          <span className="faint text-[10.5px]">{due} card{due === 1 ? '' : 's'} due now</span>
        </div>

        <div className="mt-2.5 space-y-4">
          {subject.phases.map((phase) => {
            const weeks = orderedWeeks.filter((week) => week.phaseId === phase.id)
            if (weeks.length === 0) return null
            const phaseDone = weeks.reduce((sum, week) => sum + doneCount(week), 0)
            const phaseTotal = weeks.reduce((sum, week) => sum + week.checklist.length, 0)
            const phaseCleared = weeks.filter((week) => week.gate.passedAt).length
            return (
              <section key={phase.id} aria-label={phase.name}>
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div>
                    <p className="text-[12px] font-semibold">{phase.name.replace(/^Phase \d+ · /, '')}</p>
                    <p className="faint text-[10px]">{phase.subtitle}</p>
                  </div>
                  <span className="faint num text-[10px]">
                    {phaseDone}/{phaseTotal} tasks · {phaseCleared}/{weeks.length} checkpoints
                  </span>
                </div>
                <div className="card mt-1.5 divide-y divide-line overflow-hidden">
                  {weeks.map((week) => {
                    const summary = summaries.get(week.id)!
                    const weekRatio = summary.planned.max > 0 ? summary.done.max / summary.planned.max : 0
                    const status = weekStatus(week, subject.weeks, overrides)
                    const tasksDone = week.checklist.filter((item) => item.done).length
                    return (
                      <a
                        key={week.id}
                        href={`#/plan/${week.id}`}
                        className="group flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-s2"
                        aria-label={`Open Week ${week.weekNumber}: ${week.title}`}
                      >
                        <span className="num w-8 flex-none text-[11px] font-semibold text-t3">
                          W{String(week.weekNumber).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[12px] font-medium">{week.title}</span>
                            {status === 'locked' ? <Badge tone="neutral">Locked</Badge> : null}
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <ProgressBar
                              value={weekRatio}
                              tone={week.gate.passedAt ? 'good' : 'accent'}
                              className="max-w-[260px] flex-1 !h-1"
                              label={`Week ${week.weekNumber} estimate`}
                            />
                            <span className="faint num text-[9.5px]">
                              {tasksDone}/{week.checklist.length} · {formatTotal(summary.done)} of{' '}
                              {formatTotal(summary.planned)}
                            </span>
                          </span>
                        </span>
                        <span className="hidden flex-none sm:block">
                          <WeekBadge status={status} />
                        </span>
                        <ChevronRight
                          size={13}
                          className="flex-none text-t3 transition group-hover:translate-x-0.5 group-hover:text-accent"
                          aria-hidden
                        />
                      </a>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-s1 px-3.5 py-2.5">
        <p className="faint text-[11px]">
          Totals are local to this device. Export a JSON backup in Settings before clearing browser data.
        </p>
        <a href="#/help" className="link inline-flex items-center gap-1 text-[11px]">
          How totals work <ArrowRight size={11} aria-hidden />
        </a>
      </div>
    </div>
  )
}

function doneCount(week: Week): number {
  return week.checklist.filter((item) => item.done).length
}

function ProgressStat({ label, value, meta, icon }: { label: string; value: string; meta: string; icon: ReactNode }) {
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
