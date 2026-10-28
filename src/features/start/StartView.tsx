import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  GitBranch,
  Laptop,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import {
  dailyCapacity,
  summariseSubject,
} from '../../engine/estimates'
import { courseDay, courseWeek, isPaused } from '../../lib/courseClock'
import { formatShortDate, minutesLabel } from '../../lib/dates'
import { navigate } from '../../lib/router'
import { CapacitySliders } from '../../components/ui/CapacitySliders'
import { Badge, Button, ProgressBar } from '../../components/ui/primitives'

const COURSE_DAYS = 168
const COURSE_WEEKS = 24

const WEEK_ONE_PREVIEW = [
  'Run your first Dart file and print a profile card.',
  'Store pocket money as whole paise, not decimals.',
  'Parse messy text without a bang (!) operator.',
  'Build the ledger: add, spend, show the balance.',
  'Break it with eight nasty inputs, then fix one bug.',
  'Make the receipt readable and push the first commit.',
  'Rebuild the ledger from an empty file, no notes.',
]

export function StartView() {
  const subject = useActiveSubject()
  const journey = useAppStore((state) => state.journey)
  const planner = useAppStore((state) => state.planner)
  const startCourse = useAppStore((state) => state.startCourse)
  const restartCourse = useAppStore((state) => state.restartCourse)
  const pauseCourse = useAppStore((state) => state.pauseCourse)
  const resumeCourse = useAppStore((state) => state.resumeCourse)
  const completeOnboarding = useAppStore((state) => state.completeOnboarding)
  const toast = useUiStore((state) => state.toast)
  const [restartArmed, setRestartArmed] = useState(false)

  const started = journey.startedAt !== null
  const paused = isPaused(journey)
  const openPause = journey.pauses.find((entry) => entry.to === null)
  const clockDay = courseDay(journey)
  const clockWeek = clockDay === null ? null : courseWeek(clockDay)
  const daily = dailyCapacity(planner)
  const course = summariseSubject(subject)
  const ratio = course.items > 0 ? course.doneItems / course.items : 0

  const begin = () => {
    const result = startCourse()
    if (!result.ok) {
      toast(result.message, 'error', 3600)
      return
    }
    completeOnboarding()
    toast(result.message, 'success', 4200)
    navigate('#/today')
  }

  const togglePause = () => {
    const result = paused ? resumeCourse() : pauseCourse()
    toast(result.message, result.ok ? 'success' : 'error', 3200)
  }

  const restart = () => {
    const result = restartCourse()
    toast(result.message, result.ok ? 'success' : 'error', 5000)
    setRestartArmed(false)
  }

  return (
    <div>
      <header>
        <p className="eyebrow">Day 0, before the clock</p>
        <h1 className="h1 mt-1">The course starts when you do</h1>
        <p className="muted mt-2 max-w-[68ch] text-[13px] leading-relaxed">
          One hundred and sixty-eight days of Dart, Flutter and the design that makes an app usable. Seven days a
          week, with a pause for the weeks that do not go to plan.
        </p>
      </header>

      <section className="ledger mt-5" aria-label="Course at a glance">
        <Fact label="Days" value={String(COURSE_DAYS)} meta={`${COURSE_WEEKS} weeks, seven days each`} />
        <Fact
          label="A day"
          value={minutesLabel(daily.active + daily.passive)}
          meta={`${daily.active} active, ${daily.passive} passive`}
        />
        <Fact label="Threads" value="3" meta="Dart, Flutter, design" />
        <Fact label="Where it lives" value="This device" meta="No account, no upload" />
      </section>

      {started ? (
        <section className="card mt-4 border-l-[3px] border-accent p-4" aria-labelledby="running-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Course {paused ? 'paused' : 'running'}</p>
              <h2 id="running-heading" className="h2 mt-0.5">
                Day {clockDay} of {COURSE_DAYS}
              </h2>
              <p className="muted mt-1 max-w-[58ch] text-[12.5px] leading-relaxed">
                {paused
                  ? `The clock is stopped${openPause ? ` since ${formatShortDate(openPause.from)}` : ''}. The course day waits until you resume.`
                  : `You are in Week ${clockWeek}. The clock moves on the calendar, not on time spent in this app.`}
              </p>
            </div>
            <Badge tone={paused ? 'warn' : 'good'}>{paused ? 'Paused' : 'On'}</Badge>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <ProgressBar value={ratio} className="flex-1 !h-2" label="Course tasks completed" />
            <span className="faint num text-[11.5px]">
              {course.doneItems} of {course.items} tasks
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="primary" icon={<ArrowRight size={15} />} onClick={() => navigate('#/today')}>
              Open today
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={paused ? <Play size={14} /> : <Pause size={14} />}
              onClick={togglePause}
            >
              {paused ? 'Resume' : 'Pause'} the course
            </Button>
            {restartArmed ? (
              <span className="flex flex-wrap items-center gap-1.5 rounded-lg border border-bad/30 bg-bad-soft px-2 py-1.5">
                <span className="text-[11.5px] text-bad">Start the clock again today?</span>
                <Button variant="danger" size="sm" onClick={restart}>
                  Yes, restart
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRestartArmed(false)}>
                  Cancel
                </Button>
              </span>
            ) : (
              <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={() => setRestartArmed(true)}>
                Restart the clock
              </Button>
            )}
          </div>
          <p className="faint mt-2 text-[11px]">
            Restarting moves Day 1 to today. It does not uncheck your work or delete a day card.
          </p>
        </section>
      ) : (
        <section className="card mt-4 border-l-[3px] border-accent p-4" aria-labelledby="start-heading">
          <p className="eyebrow">Ready when you are</p>
          <h2 id="start-heading" className="h2 mt-0.5">
            Day 1 is today
          </h2>
          <p className="muted mt-1.5 max-w-[64ch] text-[13px] leading-relaxed">
            Press Start once. The clock runs on calendar days. If you miss a day or a week, pause it instead of
            letting the course run ahead without you.
          </p>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            <Promise>Week 1 is written, day by day.</Promise>
            <Promise>Checking a task credits its estimate range.</Promise>
            <Promise>Progress stays in this browser.</Promise>
            <Promise>Pausing never moves the course day backwards.</Promise>
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" icon={<Play size={16} />} onClick={begin}>
              Start Day 1
            </Button>
            <span className="faint max-w-[42ch] text-[11.5px] leading-snug">
              You can pause, resume or restart the clock later. Nothing is sent anywhere.
            </span>
          </div>
        </section>
      )}

      <div className="mt-4 grid items-start gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="card p-4" aria-labelledby="clock-heading">
          <p className="eyebrow">How the clock works</p>
          <h2 id="clock-heading" className="h2 mt-0.5">
            Three rules, no surprises
          </h2>
          <ol className="mt-2.5 space-y-2.5">
            <Rule n={1} title="Day 1 is the day you press Start">
              The course day is a calendar date, not a stopwatch. The app never measures how long you sat at the
              desk.
            </Rule>
            <Rule n={2} title="Pause freezes the day count">
              A pause starts counting the next day. When you resume, the course picks up on the same day it stopped,
              even if two weeks passed.
            </Rule>
            <Rule n={3} title="A missed day is not a reset">
              Consistency is a ratio of days with evidence. It does not fall back to zero, and there is no streak to
              break.
            </Rule>
          </ol>
        </section>

        <section className="card p-4" aria-labelledby="ready-heading">
          <p className="eyebrow">Before you press Start</p>
          <h2 id="ready-heading" className="h2 mt-0.5">
            The kit
          </h2>
          <ul className="mt-2.5 space-y-2">
            <Kit icon={<Laptop size={14} />} title="A laptop with Zed and the Flutter SDK">
              flutter doctor should pass before Day 1. No Android Studio and no emulator.
            </Kit>
            <Kit icon={<Smartphone size={14} />} title="A physical Android phone">
              USB debugging on, and the cable you will actually use.
            </Kit>
            <Kit icon={<GitBranch size={14} />} title="A GitHub account">
              Signed in on the laptop. Week 1 ends with a first push.
            </Kit>
            <Kit icon={<Clock3 size={14} />} title={`About ${minutesLabel(daily.active + daily.passive)} a day`}>
              That is the default promise. Lower it below if it is not honest.
            </Kit>
          </ul>
        </section>
      </div>

      <section className="card mt-3 p-4" aria-labelledby="capacity-heading">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Your week</p>
            <h2 id="capacity-heading" className="h2 mt-0.5">
              How many hours can a week hold?
            </h2>
            <p className="faint mt-0.5 max-w-[58ch] text-[11.5px]">
              Active is building, debugging and writing code. Passive is reading docs, the book and your notes.
            </p>
          </div>
          <span className="faint num text-[11.5px]">
            {minutesLabel(daily.active)} active + {minutesLabel(daily.passive)} passive a day
          </span>
        </div>
        <CapacitySliders className="mt-3" />
        <p className="faint mt-2 border-t border-line pt-2 text-[11px]">
          The plan is the same for everyone. Capacity is yours, stored on this device, and never overwritten by an
          imported backup.
        </p>
      </section>

      <details className="card mt-3 overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3.5 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="eyebrow">Week 1</p>
            <p className="mt-0.5 text-[13px] font-semibold">What the first seven days ask of you</p>
          </div>
          <ArrowRight size={15} className="flex-none text-t3" aria-hidden />
        </summary>
        <ol className="space-y-2 border-t border-line p-3.5">
          {WEEK_ONE_PREVIEW.map((item, index) => (
            <li key={item} className="flex items-start gap-2.5">
              <span className="num mt-0.5 w-4 flex-none text-[11px] font-semibold text-t3">{index + 1}</span>
              <span className="text-[12.5px] leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      </details>

      <section className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-s2 p-3.5">
        <ShieldCheck size={15} className="mt-0.5 flex-none text-good" aria-hidden />
        <p className="faint text-[11.5px] leading-relaxed">
          No account, no analytics, no sync. The app stores progress in this browser and can export a JSON backup.
          If you add an AI key later, it stays in this browser and never enters a backup or a log.
        </p>
      </section>
    </div>
  )
}

function Fact({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div>
      <p className="eyebrow truncate">{label}</p>
      <p className="num mt-1 text-[19px] leading-none font-semibold">{value}</p>
      <p className="faint mt-1 text-[11px]">{meta}</p>
    </div>
  )
}

function Promise({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2 text-[12px] leading-relaxed">
      <CheckCircle2 size={13} className="mt-0.5 flex-none text-good" aria-hidden />
      <span>{children}</span>
    </li>
  )
}

function Rule({ n, title, children }: { n: number; title: string; children: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="num mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full border border-line bg-s2 text-[10.5px] font-semibold text-t3">
        {n}
      </span>
      <div>
        <p className="text-[12.5px] font-semibold">{title}</p>
        <p className="muted mt-0.5 text-[12px] leading-relaxed">{children}</p>
      </div>
    </li>
  )
}

function Kit({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: string
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-lg bg-s2 text-t2">
        {icon}
      </span>
      <div>
        <p className="text-[12px] font-medium">{title}</p>
        <p className="faint mt-0.5 text-[11.5px] leading-relaxed">{children}</p>
      </div>
    </li>
  )
}
