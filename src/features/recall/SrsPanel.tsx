import { useEffect, useMemo, useState } from 'react'
import {
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Layers,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import type { Flashcard } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { dueCards, intervalLabel, isCardDue } from '../../engine/srs'
import type { Grade } from '../../engine/srs'
import { relativeDays } from '../../lib/dates'
import { cn } from '../../lib/utils'
import { Badge, Button, EmptyState, ProgressBar, SectionHead } from '../../components/ui/primitives'

type SessionMode = 'due' | 'new' | 'mixed'
interface Session {
  ids: string[]
  index: number
  mode: SessionMode
  grades: Record<Grade, number>
}

const GRADE_ORDER: Grade[] = ['again', 'hard', 'good', 'easy']

function emptyGrades(): Record<Grade, number> {
  return { again: 0, hard: 0, good: 0, easy: 0 }
}

function nextInterval(card: Flashcard, grade: Grade): string {
  const step = card.dueAt === 0 ? 0 : Math.min(4, card.scheduleStep)
  if (grade === 'again') return intervalLabel(0)
  if (grade === 'hard') return intervalLabel(step)
  const next = Math.min(4, step + (grade === 'easy' ? 2 : 1))
  return intervalLabel(next)
}

export function SrsPanel() {
  const subject = useActiveSubject()
  const reviewCard = useAppStore((state) => state.reviewCard)
  const [session, setSession] = useState<Session | null>(null)
  const [revealed, setRevealed] = useState(false)

  const due = useMemo(() => dueCards(subject.cards), [subject.cards])
  const fresh = useMemo(() => subject.cards.filter((card) => card.dueAt === 0), [subject.cards])
  const scheduled = subject.cards.filter((card) => card.dueAt > 0)
  const mature = subject.cards.filter((card) => card.scheduleStep >= 3).length
  const lapses = subject.cards.reduce((sum, card) => sum + card.lapses, 0)

  const start = (mode: SessionMode) => {
    const dueIds = due.map((card) => card.id)
    const freshIds = fresh.slice(0, 12).map((card) => card.id)
    const ids =
      mode === 'due' ? dueIds : mode === 'new' ? freshIds : [...dueIds, ...freshIds].slice(0, 40)
    if (ids.length === 0) return
    setSession({ ids, index: 0, mode, grades: emptyGrades() })
    setRevealed(false)
  }

  const currentCard = session ? subject.cards.find((card) => card.id === session.ids[session.index]) : undefined
  const finished = Boolean(session && session.index >= session.ids.length)

  const advance = (grade: Grade) => {
    if (!session || !currentCard || !revealed) return
    reviewCard(currentCard.id, grade)
    setSession((current) =>
      current
        ? {
            ...current,
            index: current.index + 1,
            grades: { ...current.grades, [grade]: current.grades[grade] + 1 },
          }
        : current,
    )
    setRevealed(false)
  }

  useEffect(() => {
    if (!session) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSession(null)
        setRevealed(false)
        return
      }
      if (!revealed) {
        if (event.code === 'Space' || event.key === 'Enter') {
          event.preventDefault()
          setRevealed(true)
        }
        return
      }
      const map: Record<string, Grade> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }
      const grade = map[event.key]
      if (grade) {
        event.preventDefault()
        advance(grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, revealed, currentCard?.id])

  if (session) {
    if (finished) {
      const total = session.ids.length
      return (
        <div className="card card-pad">
          <div className="mx-auto max-w-md py-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-good-soft text-good" aria-hidden>
              <CheckCircle2 size={24} />
            </span>
            <h2 className="h1 mt-3 text-[1.35rem]">Session complete</h2>
            <p className="muted mt-1 text-[13px]">
              {total} card{total === 1 ? '' : 's'} reviewed. The schedule now owns them; trust it until tomorrow.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {GRADE_ORDER.map((grade) => (
                <div key={grade} className="rounded-xl border border-line bg-s2 px-2 py-2">
                  <p className="faint text-[9.5px] capitalize">{grade}</p>
                  <p className="num text-[17px] font-semibold">{session.grades[grade]}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                icon={<RotateCcw size={13} />}
                onClick={() => {
                  setSession(null)
                  setRevealed(false)
                }}
              >
                Back to recall
              </Button>
              {fresh.length > 0 ? (
                <Button variant="primary" onClick={() => start('new')} icon={<Sparkles size={13} />}>
                  Study {Math.min(12, fresh.length)} new
                </Button>
              ) : null}
            </div>
            <p className="faint mt-3 text-[10.5px]">
              Every card now has a next review date. No streak is awarded for cramming.
            </p>
          </div>
        </div>
      )
    }

    if (!currentCard) {
      return (
        <div className="card">
          <EmptyState
            title="This card disappeared"
            description="It was removed from the deck while the session was open."
            action={<Button variant="primary" onClick={() => setSession(null)}>End session</Button>}
          />
        </div>
      )
    }

    const week = subject.weeks.find((entry) => entry.id === currentCard.weekId)
    const node = currentCard.nodeId ? subject.nodes.find((entry) => entry.id === currentCard.nodeId) : undefined
    const progress = session.ids.length ? session.index / session.ids.length : 0

    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge tone="accent">{session.mode === 'mixed' ? 'Mixed session' : session.mode === 'due' ? 'Due review' : 'New cards'}</Badge>
            <span className="faint num text-[11px]">
              {session.index + 1} / {session.ids.length}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSession(null); setRevealed(false) }}>
            End session
          </Button>
        </div>
        <ProgressBar value={progress} className="mt-2" label="Session progress" />

        <div className="card mt-3 flex min-h-[360px] flex-col p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={currentCard.source === 'mistake' ? 'bad' : 'neutral'}>
              {currentCard.source === 'mistake' ? 'Mistake log' : 'Core concept'}
            </Badge>
            {week ? <span className="pill !py-0.5 !text-[10px]">Week {week.weekNumber}</span> : null}
            {node ? <span className="faint truncate text-[10.5px]">· {node.title}</span> : null}
            <span className="faint ml-auto text-[10px]">{relativeDays(currentCard.dueAt)}</span>
          </div>

          <div className="flex flex-1 items-center justify-center px-1 py-8">
            <p className="max-w-xl text-center text-[19px] leading-snug font-semibold sm:text-[21px]">
              {currentCard.front}
            </p>
          </div>

          {revealed ? (
            <div className="rounded-xl border border-line bg-s2 p-3.5">
              <p className="eyebrow mb-1.5">Answer</p>
              <p className="text-[13.5px] leading-relaxed text-t2">{currentCard.back}</p>
              {currentCard.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {currentCard.tags.map((tag) => (
                    <span key={tag} className="pill !py-0 !text-[9.5px]">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-center">
              <Button variant="primary" size="lg" onClick={() => setRevealed(true)} className="px-8">
                Show answer
              </Button>
              <p className="faint mt-1.5 text-[10px]">Space / Enter</p>
            </div>
          )}

          {revealed ? (
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {GRADE_ORDER.map((grade, index) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => advance(grade)}
                    className={cn(
                      'flex min-h-[52px] flex-col items-center justify-center rounded-xl border px-2 py-1.5 transition',
                      grade === 'again'
                        ? 'border-bad/25 bg-bad-soft text-bad hover:border-bad/50'
                        : grade === 'hard'
                          ? 'border-warn/25 bg-warn-soft text-warn hover:border-warn/50'
                          : grade === 'good'
                            ? 'border-accent/30 bg-accent-soft text-accent-strong hover:border-accent/60'
                            : 'border-good/25 bg-good-soft text-good hover:border-good/50',
                    )}
                  >
                    <span className="text-[12px] font-semibold">
                      {grade[0]!.toUpperCase() + grade.slice(1)}
                      <span className="faint ml-1 font-mono text-[9px]">{index + 1}</span>
                    </span>
                    <span className="text-[10px] opacity-80">{nextInterval(currentCard, grade)}</span>
                  </button>
                ))}
              </div>
              <p className="faint mt-2 text-center text-[10px]">
                Grade only what you retrieved. “Good” is not a reward for recognising the answer.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  const total = subject.cards.length
  const queue = due.length + fresh.length

  return (
    <div>
      <div className="grid gap-2 lg:grid-cols-[1.35fr_1fr]">
        <section className="card card-pad">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Today · {new Date().toLocaleDateString(undefined, { weekday: 'long' })}</p>
              <h2 className="h1 mt-1 text-[1.35rem]">
                {queue > 0 ? 'Retrieve before you consume.' : 'Queue clear.'}
              </h2>
              <p className="muted mt-1 max-w-md text-[12.5px]">
                {queue > 0
                  ? 'A card is only learned when it can be answered cold. Mixed sessions clear due reviews first, then introduce new material.'
                  : 'No scheduled reviews are due and no new cards are waiting. Add cards or enjoy the empty queue.'}
              </p>
            </div>
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent-soft text-accent" aria-hidden>
              <BrainCircuit size={19} />
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <QueueStat label="Due" value={due.length} tone={due.length ? 'accent' : 'neutral'} />
            <QueueStat label="New" value={fresh.length} tone={fresh.length ? 'info' : 'neutral'} />
            <QueueStat label="Scheduled" value={scheduled.length} />
            <QueueStat label="Mature" value={mature} tone="good" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {queue > 0 ? (
              <Button variant="primary" size="lg" icon={<Sparkles size={15} />} onClick={() => start('mixed')}>
                Start {due.length + Math.min(12, fresh.length) < 40 ? due.length + Math.min(12, fresh.length) : 40}-card session
              </Button>
            ) : (
              <Button variant="outline" size="lg" onClick={() => { setSession(null) }} disabled>
                Nothing due
              </Button>
            )}
            {due.length > 0 ? (
              <Button variant="outline" size="lg" icon={<Clock3 size={14} />} onClick={() => start('due')}>
                Due only ({due.length})
              </Button>
            ) : null}
            {fresh.length > 0 ? (
              <Button variant="ghost" size="lg" icon={<Layers size={14} />} onClick={() => start('new')}>
                New only ({Math.min(12, fresh.length)})
              </Button>
            ) : null}
          </div>

          {total === 0 ? (
            <p className="faint mt-3 text-[11px]">
              The deck is empty. Add cards in the Deck tab or import AI-generated JSON.
            </p>
          ) : null}
        </section>

        <section className="card card-pad">
          <SectionHead title="The schedule" eyebrow="Fixed ladder" />
          <div className="flex items-center gap-1.5">
            {[1, 3, 6, 10, 7].map((days, index) => (
              <div key={`${days}-${index}`} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className={cn(
                    'grid h-9 w-full place-items-center rounded-lg border text-[12px] font-semibold',
                    index === 4
                      ? 'border-good/25 bg-good-soft text-good'
                      : 'border-line bg-s2 text-t2',
                  )}
                >
                  {index === 4 ? '∞' : `${days}d`}
                </span>
                <span className="faint text-[9px]">step {index + 1}</span>
              </div>
            ))}
          </div>
          <p className="muted mt-3 text-[11.5px] leading-relaxed">
            Again resets to tomorrow. Hard keeps the current interval. Good advances one step; Easy skips a step.
            The ladder caps at weekly forever.
          </p>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between rounded-lg border border-line bg-s2 px-2.5 py-2">
              <span className="faint text-[11px]">Total lapses</span>
              <span className="num text-[12px] font-semibold">{lapses}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line bg-s2 px-2.5 py-2">
              <span className="faint text-[11px]">Cards due today</span>
              <span className="num text-[12px] font-semibold">{subject.cards.filter((card) => isCardDue(card)).length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-line bg-s2 px-2.5 py-2">
              <span className="faint text-[11px]">Next scheduled card</span>
              <span className="text-[11.5px] font-medium">
                {scheduled.length
                  ? relativeDays(Math.min(...scheduled.map((card) => card.dueAt)))
                  : 'none'}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="card card-pad mt-2">
        <SectionHead
          title="Today’s queue"
          eyebrow="Due first · new second"
          action={
            due.length > 0 ? (
              <Button size="sm" variant="soft" onClick={() => start('due')}>
                Clear {due.length} due
              </Button>
            ) : undefined
          }
        />
        {due.length === 0 && fresh.length === 0 ? (
          <EmptyState
            compact
            icon={<CheckCircle2 size={17} />}
            title="Nothing to retrieve"
            description="The schedule is clear. Add new cards or let the knowledge settle until tomorrow."
          />
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {[...due, ...fresh.slice(0, 6)].map((card) => (
              <div key={card.id} className="rounded-xl border border-line bg-s1 p-2.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      card.dueAt === 0 ? 'bg-info' : 'bg-accent',
                    )}
                    aria-hidden
                  />
                  <span className="faint text-[9.5px] uppercase tracking-wide">
                    {card.dueAt === 0 ? 'New' : 'Due'}
                  </span>
                  <span className="faint ml-auto text-[9.5px]">{relativeDays(card.dueAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11.5px] font-medium">{card.front}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function QueueStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'accent' | 'info' | 'good'
}) {
  const colour =
    tone === 'accent' ? 'text-accent' : tone === 'info' ? 'text-info' : tone === 'good' ? 'text-good' : 'text-t1'
  return (
    <div className="rounded-xl border border-line bg-s2 px-2.5 py-2">
      <p className="faint text-[9.5px] uppercase tracking-wide">{label}</p>
      <p className={cn('num text-[18px] font-semibold leading-tight', colour)}>{value}</p>
    </div>
  )
}
