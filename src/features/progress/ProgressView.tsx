import { useMemo } from 'react'
import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Circle,
  Crown,
  Swords,
  Target,
  Trophy,
} from 'lucide-react'
import type { Week } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { overallMastery, weekStatus } from '../../engine/gating'
import { formatTotal, summariseSubject, summariseWeek } from '../../engine/estimates'
import { dueCards } from '../../engine/srs'
import { milestonesFor } from '../../engine/milestones'
import { gameStatsFor } from '../../engine/gamification'
import { formatShortDate } from '../../lib/dates'
import { percent } from '../../lib/utils'
import { navigate } from '../../lib/router'
import { Badge, Button, ProgressBar, ProgressRing, WeekBadge } from '../../components/ui/primitives'

export function ProgressView() {
  const subject = useActiveSubject()
  const overrides = useAppStore((state) => state.overrides)
  const planner = useAppStore((state) => state.planner)
  const journey = useAppStore((state) => state.journey)
  const startWeekday = journey.startWeekday
  const gameLayer = journey.gameLayer

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
    () => new Map(orderedWeeks.map((week) => [week.id, summariseWeek(week, planner, startWeekday)])),
    [orderedWeeks, planner, startWeekday],
  )
  const marks = useMemo(() => milestonesFor(subject), [subject])
  const earned = marks.filter((mark) => mark.earned).length
  const gameStats = useMemo(() => gameStatsFor(subject, journey), [subject, journey])

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
                {course.weeks} weeks across {subject.phases.length} phases in {subject.shortName}
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
              <span className="faint num text-[11.5px]">{percent(estimateRatio)}%</span>
            </div>
            <ProgressBar value={estimateRatio} className="mt-2 !h-2" label="Course estimate completed" />
            <p className="faint mt-2 text-[11.5px]">
              {formatTotal(course.remaining)} of estimated work remains. Ranges come from each task, so they stay
              honest even when a task runs long.
            </p>
          </div>
        </div>
      </section>

      <section className="ledger mt-3" aria-label="Progress totals">
        <ProgressStat label="Completed" value={formatTotal(course.done)} meta="Credited estimate" />
        <ProgressStat label="Remaining" value={formatTotal(course.remaining)} meta="Planned minus done" />
        <ProgressStat label="Checkpoints" value={`${cleared} of ${orderedWeeks.length}`} meta="Cleared without notes" />
        <ProgressStat
          label="Concepts"
          value={`${mastered} of ${subject.nodes.length}`}
          meta={`${percent(overallMastery(subject.nodes))}% mastered`}
        />
      </section>

      {gameLayer && (gameStats.xp > 0 || gameStats.quests.length > 0) && (
        <section className="card mt-4 p-4" aria-labelledby="game-stats-heading">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Your journey</p>
              <h2 id="game-stats-heading" className="h2 mt-0.5">
                Level {gameStats.level}: {gameStats.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-accent" />
              <span className="text-2xl font-bold num">{gameStats.xp}</span>
              <span className="faint text-sm">XP</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="faint">
                {gameStats.nextLevelAt !== null
                  ? `${gameStats.xp} / ${gameStats.nextLevelAt} XP`
                  : 'Max level reached'}
              </span>
              <span className="faint num">{percent(gameStats.levelProgress)}%</span>
            </div>
            <ProgressBar
              value={gameStats.levelProgress}
              className="mt-2 !h-2"
              label="Progress to next level"
            />
          </div>

          {gameStats.quests.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-2">
                <Swords size={16} className="text-accent" />
                <p className="text-sm font-semibold">Active quests</p>
              </div>
              <p className="faint mb-2 text-[11px]">
                A quest marks XP already inside your total. Clearing it pays nothing twice.
              </p>
              <div className="space-y-2">
                {gameStats.quests.map((quest) => (
                  <div
                    key={quest.id}
                    className={`rounded-lg border p-3 ${
                      quest.earned ? 'border-good/30 bg-good-soft' : 'border-line bg-s1'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-t3">
                            {quest.window === 'today' ? 'Today' : 'This week'}
                          </span>
                          {quest.earned && (
                            <Badge tone="good">
                              Complete
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium">{quest.title}</p>
                        <p className="mt-0.5 text-xs text-t3">{quest.detail}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="num text-sm font-semibold">Worth {quest.xp} XP</span>
                        {quest.progress.total > 0 && (
                          <span className="text-xs text-t3">
                            {quest.progress.done}/{quest.progress.total}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameStats.boss && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-2">
                <Crown size={16} className="text-accent" />
                <p className="text-sm font-semibold">Boss fight</p>
              </div>
              <div
                className={`rounded-lg border p-3 ${
                  gameStats.boss.defeated
                    ? 'border-good/30 bg-good-soft'
                    : 'border-accent/30 bg-accent-soft'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{gameStats.boss.title}</p>
                    <p className="mt-0.5 text-xs text-t3">{gameStats.boss.detail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="num text-sm font-semibold">Worth {gameStats.boss.xp} XP</span>
                    {gameStats.boss.defeated && (
                      <Badge tone="good">
                        Defeated
                      </Badge>
                    )}
                  </div>
                </div>
                {!gameStats.boss.defeated && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="faint">Progress</span>
                      <span className="faint num">
                        {gameStats.boss.progress.done}/{gameStats.boss.progress.total}
                      </span>
                    </div>
                    <ProgressBar
                      value={gameStats.boss.progress.done / gameStats.boss.progress.total}
                      className="!h-1.5"
                      label="Boss progress"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {gameLayer ? (
        <section className="card mt-4 p-3.5" aria-labelledby="marks-heading">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Evidence you already earned</p>
              <h2 id="marks-heading" className="h2 mt-0.5">
                Marks
              </h2>
              <p className="faint mt-0.5 text-[11px]">
                A mark records work you finished. No mark counts days, so a pause never takes one away.
              </p>
            </div>
            <span className="faint num text-[11.5px]">
              {earned} of {marks.length}
            </span>
          </div>
          <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
            {marks.map((mark) => (
              <li
                key={mark.id}
                className={`flex items-start gap-2 rounded-xl border px-2.5 py-2 ${
                  mark.earned ? 'border-good/30 bg-good-soft' : 'border-line bg-s1'
                }`}
              >
                {mark.earned ? (
                  <CheckCircle2 size={14} className="mt-0.5 flex-none text-good" aria-hidden />
                ) : (
                  <Circle size={14} className="mt-0.5 flex-none text-t3" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium">{mark.title}</span>
                  <span className="faint block text-[11px] leading-snug">
                    {mark.earned
                      ? mark.earnedAt
                        ? `Earned ${formatShortDate(mark.earnedAt)}`
                        : 'Earned'
                      : mark.progress && mark.progress.total > 1
                        ? `${mark.detail} ${mark.progress.done} of ${mark.progress.total}.`
                        : mark.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-4" aria-labelledby="phase-progress-heading">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
          <div>
            <p className="eyebrow">The whole route</p>
            <h2 id="phase-progress-heading" className="h2 mt-0.5">
              Phase and week progress
            </h2>
          </div>
          <span className="faint text-[11.5px]">{due} card{due === 1 ? '' : 's'} due now</span>
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
                    <p className="faint text-[11px]">{phase.subtitle}</p>
                  </div>
                  <span className="faint num text-[11px]">
                    {phaseDone} of {phaseTotal} tasks, {phaseCleared} of {weeks.length} checkpoints
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
                            <span className="truncate text-[13px] font-medium">{week.title}</span>
                            {status === 'locked' ? <Badge tone="neutral">Locked</Badge> : null}
                          </span>
                          <span className="mt-1 flex items-center gap-2">
                            <ProgressBar
                              value={weekRatio}
                              tone={week.gate.passedAt ? 'good' : 'accent'}
                              className="max-w-[260px] flex-1 !h-1"
                              label={`Week ${week.weekNumber} estimate`}
                            />
                            <span className="faint num text-[11px]">
                              {tasksDone} of {week.checklist.length}, {formatTotal(summary.done)} of{' '}
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
          How totals work
        </a>
      </div>
    </div>
  )
}

function doneCount(week: Week): number {
  return week.checklist.filter((item) => item.done).length
}

function ProgressStat({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div>
      <p className="eyebrow truncate">{label}</p>
      <p className="num mt-1 text-[19px] leading-none font-semibold">{value}</p>
      <p className="faint mt-1 text-[11px]">{meta}</p>
    </div>
  )
}
