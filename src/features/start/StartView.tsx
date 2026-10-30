import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Laptop,
  Pause,
  Play,
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

const CHECKLIST_ITEMS = [
  { id: 'laptop', text: 'A laptop with Zed and Flutter SDK installed' },
  { id: 'phone', text: 'A physical Android phone with USB debugging on' },
  { id: 'github', text: 'A GitHub account signed in on the laptop' },
  { id: 'flutter-doctor', text: 'Ran flutter doctor and it passes' },
  { id: 'git-config', text: 'Set git config user.name and user.email' },
  { id: 'course-folder', text: 'Created a course folder on the laptop' },
  { id: 'capacity', text: 'Set realistic weekly hours below' },
  { id: 'schedule', text: 'Picked 5-7 study days that work for me' },
  { id: 'commitment', text: 'Ready to commit 168 days to this course' },
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
  const [restartInput, setRestartInput] = useState('')
  const restartConfirmed = restartInput.toLowerCase() === 'restart'
  const [checklistComplete, setChecklistComplete] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

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

  const toggleChecklistItem = (id: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(id)) {
      newChecked.delete(id)
    } else {
      newChecked.add(id)
    }
    setCheckedItems(newChecked)
    setChecklistComplete(newChecked.size === CHECKLIST_ITEMS.length)
  }

  const restart = () => {
    const result = restartCourse()
    toast(result.message, result.ok ? 'success' : 'error', 5000)
    setRestartInput('')
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
            {!restartConfirmed ? (
              <div className="flex flex-col gap-2 rounded-lg border border-bad/30 bg-bad-soft px-3 py-2">
                <p className="text-[11.5px] text-bad">
                  Type "restart" to confirm. This moves Day 1 to today.
                </p>
                <input
                  type="text"
                  value={restartInput}
                  onChange={(e) => setRestartInput(e.target.value)}
                  placeholder="restart"
                  className="w-full rounded border border-line bg-s1 px-2 py-1 text-[12px] placeholder:text-t3 focus:border-accent focus:outline-none"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="danger" size="sm" onClick={restart}>
                  Restart the clock
                </Button>
                <span className="text-[11px] text-t3">Day 1 moves to today</span>
              </div>
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

          <div className="mt-4 rounded-lg border border-line bg-s2 p-3">
            <p className="text-[12px] font-semibold">Before you start, make sure:</p>
            <ul className="mt-2 space-y-1.5">
              {CHECKLIST_ITEMS.map((item) => (
                <li key={item.id}>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedItems.has(item.id)}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="mt-0.5 h-4 w-4 rounded border-line"
                    />
                    <span className="text-[11.5px] leading-snug">{item.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={<Play size={16} />}
              onClick={begin}
              disabled={!checklistComplete}
            >
              Start Day 1
            </Button>
            <span className="faint max-w-[42ch] text-[11.5px] leading-snug">
              {checklistComplete
                ? 'You can pause, resume or restart the clock later. Nothing is sent anywhere.'
                : `Complete the checklist above (${checkedItems.size}/${CHECKLIST_ITEMS.length})`}
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

        <section className="card p-4" aria-labelledby="surfaces-heading">
          <p className="eyebrow">Where you will work</p>
          <h2 id="surfaces-heading" className="h2 mt-0.5">
            Three surfaces, one course
          </h2>
          <ul className="mt-2.5 space-y-2">
            <Kit icon={<Laptop size={14} />} title="Laptop with Zed">
              Where you write code, run tests, and build apps. This is the main work surface.
            </Kit>
            <Kit icon={<Smartphone size={14} />} title="Physical Android phone">
              Where you test and use the apps you build. A real device, not an emulator.
            </Kit>
            <Kit icon={<GitBranch size={14} />} title="Paper notebook">
              Where you sketch ideas, take notes, and think through problems before coding.
            </Kit>
          </ul>
        </section>
      </div>

      <section className="card mt-3 p-4" aria-labelledby="learning-heading">
        <p className="eyebrow">How to learn</p>
        <h2 id="learning-heading" className="h2 mt-0.5">
          Learning to learn
        </h2>
        <p className="muted mt-1.5 max-w-[64ch] text-[13px] leading-relaxed">
          This course teaches you to build real apps, not just follow tutorials. You will read documentation, write
          code, test it on your phone, and fix what breaks. Every week has a checkpoint where you prove you can rebuild
          the week's work without notes.
        </p>
        <p className="muted mt-2 text-[12px] leading-relaxed">
          The app shows you what to do today. The day card explains the concept. The checklist tracks your progress.
          When you check every task, you have done the work. When you pass the checkpoint, you have learned it.
        </p>
      </section>

      <section className="card mt-3 p-4" aria-labelledby="tutorial-hell-heading">
        <p className="eyebrow">What to avoid</p>
        <h2 id="tutorial-hell-heading" className="h2 mt-0.5">
          Tutorial hell
        </h2>
        <p className="muted mt-1.5 max-w-[64ch] text-[13px] leading-relaxed">
          Tutorial hell is when you watch videos and read articles but never build anything yourself. You feel like
          you're learning, but you can't write code without help.
        </p>
        <div className="mt-3 rounded-lg border border-line bg-s2 p-3">
          <p className="text-[12px] font-semibold">This course prevents tutorial hell by:</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-start gap-2 text-[11.5px] leading-snug">
              <CheckCircle2 size={13} className="mt-0.5 flex-none text-good" aria-hidden />
              <span>Every day has active tasks where you write code</span>
            </li>
            <li className="flex items-start gap-2 text-[11.5px] leading-snug">
              <CheckCircle2 size={13} className="mt-0.5 flex-none text-good" aria-hidden />
              <span>Every week ends with a checkpoint where you rebuild the work</span>
            </li>
            <li className="flex items-start gap-2 text-[11.5px] leading-snug">
              <CheckCircle2 size={13} className="mt-0.5 flex-none text-good" aria-hidden />
              <span>The checkpoint is closed-book — no notes, no tutorials</span>
            </li>
            <li className="flex items-start gap-2 text-[11.5px] leading-snug">
              <CheckCircle2 size={13} className="mt-0.5 flex-none text-good" aria-hidden />
              <span>You only move forward when you prove you can do it yourself</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="card mt-3 p-4" aria-labelledby="dunning-heading">
        <p className="eyebrow">What to expect</p>
        <h2 id="dunning-heading" className="h2 mt-0.5">
          The Dunning-Kruger curve
        </h2>
        <p className="muted mt-1.5 max-w-[64ch] text-[13px] leading-relaxed">
          When you start, you don't know what you don't know. After a few weeks, you learn enough to realize how much
          there is to learn. This feels like you're getting worse, but you're actually getting better — your standards
          are rising.
        </p>
        <p className="muted mt-2 text-[12px] leading-relaxed">
          This is normal. Every programmer goes through it. The course is designed to carry you through this dip. The
          checkpoints prove you're making progress even when it doesn't feel like it.
        </p>
      </section>

      <section className="card mt-3 p-4" aria-labelledby="session-heading">
        <p className="eyebrow">How a day works</p>
        <h2 id="session-heading" className="h2 mt-0.5">
          How a session runs
        </h2>
        <p className="muted mt-1.5 max-w-[64ch] text-[13px] leading-relaxed">
          Each day has a card that explains the concept in plain language. Below it is a checklist of tasks. Work
          through them in order. When you finish a task, check it off. When you finish every task, the day is done.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-s2 p-2.5">
            <p className="eyebrow">Passive work</p>
            <p className="mt-1 text-[12px] leading-relaxed">
              Reading docs, watching videos, studying examples. This builds understanding.
            </p>
          </div>
          <div className="rounded-lg border border-accent/20 bg-accent-soft/60 p-2.5">
            <p className="eyebrow">Active work</p>
            <p className="mt-1 text-[12px] leading-relaxed">
              Writing code, running tests, fixing bugs. This builds skill. Every day has both.
            </p>
          </div>
        </div>
        <p className="muted mt-2 text-[11.5px]">
          The app estimates how long each day takes. These are ranges, not timers. Finish the work, not the clock.
        </p>
      </section>

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
