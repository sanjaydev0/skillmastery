import { useMemo } from 'react'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarCheck2,
  CheckCircle2,
  CircleDot,
  Flame,
  GitBranch,
  Library,
  Lock,
  Network,
  Orbit,
  Sparkles,
  Target,
  Wrench,
} from 'lucide-react'
import type { WeekStatus } from '../../types/schema'
import { CORE_RHYTHM_IDS, RHYTHM_ITEMS } from '../../data/rhythm'
import { PROMPTS, SKILL_FORMULA } from '../../data/prompts'
import { useActiveSubject, useActiveWeek, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { activeFlags } from '../../engine/remediation'
import { nodeBadge, overallMastery, weekProgress, weekStatus } from '../../engine/gating'
import { dueCards } from '../../engine/srs'
import { computeStreak, recentDays } from '../../engine/streak'
import { dateKey, formatShortDate, minutesLabel } from '../../lib/dates'
import { percent } from '../../lib/utils'
import { navigate } from '../../lib/router'
import {
  Badge,
  Button,
  CheckRow,
  EmptyState,
  ProgressBar,
  ProgressRing,
  SectionHead,
  Stat,
  WeekBadge,
} from '../../components/ui/primitives'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function OverviewView() {
  const subject = useActiveSubject()
  const week = useActiveWeek()
  const overrides = useAppStore((state) => state.overrides)
  const dailyLog = useAppStore((state) => state.dailyLog)
  const mode = useAppStore((state) => state.prefs.mode)
  const toggleDailyItem = useAppStore((state) => state.toggleDailyItem)
  const toggleChecklist = useAppStore((state) => state.toggleChecklist)
  const books = useAppStore((state) => state.books)
  const updateBook = useAppStore((state) => state.updateBook)
  const openPalette = useUiStore((state) => state.openPalette)

  const stats = useMemo(() => {
    const nodes = subject.nodes
    const mastered = nodes.filter((node) => node.status === 'mastered').length
    const badges = nodes.map((node) => nodeBadge(node, subject, overrides))
    const gates = subject.weeks.filter((entry) => entry.gate.passedAt).length
    const due = dueCards(subject.cards)
    const fresh = subject.cards.filter((card) => card.dueAt === 0)
    const repair = nodes.filter(
      (node) => node.status === 'needs-repair' || activeFlags(node).length > 0,
    )
    return {
      mastered,
      gates,
      due,
      fresh,
      repair,
      badgeCounts: {
        mastered: badges.filter((badge) => badge === 'mastered').length,
        learning: badges.filter((badge) => badge === 'learning').length,
        ready: badges.filter((badge) => badge === 'ready').length,
        repair: badges.filter((badge) => badge === 'needs-repair').length,
        locked: badges.filter((badge) => badge === 'locked').length,
      },
    }
  }, [subject, overrides])

  const today = dateKey()
  const todayItems = dailyLog[today]?.items ?? []
  const rhythmItems = RHYTHM_ITEMS.filter((item) => item.mode === mode || item.mode === 'both')
  const rhythmDone = rhythmItems.filter((item) => todayItems.includes(item.id)).length
  const streak = computeStreak(dailyLog, CORE_RHYTHM_IDS)
  const dots = recentDays(dailyLog, CORE_RHYTHM_IDS, 7)

  const weekDay = week?.weekNumber ?? 1
  const currentBooks = books
    .filter((book) => weekDay >= book.weekFrom && weekDay <= book.weekTo)
    .slice(0, 3)
  const shownBooks = currentBooks.length ? currentBooks : books.slice(0, 3)
  const weekStatusValue: WeekStatus | null = week ? weekStatus(week, subject.weeks, overrides) : null
  const modeTasks =
    week?.checklist.filter((item) => item.context === mode && !item.done).slice(0, 3) ?? []
  const modeDone = week?.checklist.filter((item) => item.context === mode && item.done).length ?? 0
  const modeTotal = week?.checklist.filter((item) => item.context === mode).length ?? 0
  const prompt = PROMPTS[new Date().getDay() % PROMPTS.length] ?? PROMPTS[0]!
  const repairs = stats.repair.slice(0, 3)
  const activeRepairCount = subject.nodes.reduce(
    (sum, node) => sum + activeFlags(node).length,
    0,
  )

  return (
    <div>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="h1 mt-1">{greeting()}. Ready to compound?</h1>
          <p className="muted mt-1 text-[13px]">
            <span className="font-medium text-t1">{subject.shortName}</span>
            {week ? ` · Week ${week.weekNumber} of ${subject.weeks.length}` : ''} · {mode} mode ·{' '}
            {streak.current}-day core streak
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Target size={13} />}
            onClick={openPalette}
            className="hidden sm:inline-flex"
          >
            Command palette
          </Button>
          <Button variant="primary" size="sm" icon={<CalendarCheck2 size={14} />} onClick={() => navigate('#/curriculum')}>
            Open curriculum
          </Button>
        </div>
      </header>

      <div className="bento mt-5">
        {/* active week */}
        <section className="card col-span-2 overflow-hidden lg:col-span-8">
          {week ? (
            <div className="relative p-4 sm:p-5">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-60"
                style={{
                  background:
                    'linear-gradient(120deg, color-mix(in srgb, var(--accent) 12%, transparent), transparent 62%)',
                }}
                aria-hidden
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone="accent">Active week</Badge>
                    {weekStatusValue ? <WeekBadge status={weekStatusValue} /> : null}
                    {week.capstone ? <Badge tone="warn">Capstone</Badge> : null}
                  </div>
                  <p className="eyebrow">
                    Week {week.weekNumber} · {subject.phases.find((phase) => phase.id === week.phaseId)?.name ?? 'Phase'}
                  </p>
                  <h2 className="h1 mt-1 max-w-2xl text-[1.45rem] sm:text-[1.65rem]">{week.title}</h2>
                  <p className="muted mt-2 max-w-2xl text-[13px] leading-relaxed">{week.anchor}</p>
                </div>
                <ProgressRing
                  value={weekProgress(week)}
                  size={60}
                  label={`${percent(weekProgress(week))}%`}
                  sublabel="week"
                />
              </div>

              <div className="relative mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-line bg-s2/70 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="eyebrow">{mode} block · next up</p>
                    <span className="faint num text-[11.5px]">
                      {modeDone}/{modeTotal} done
                    </span>
                  </div>
                  {modeTasks.length > 0 ? (
                    <div className="space-y-1.5">
                      {modeTasks.map((item) => (
                        <CheckRow
                          key={item.id}
                          checked={item.done}
                          onToggle={() => toggleChecklist(week.id, item.id)}
                          label={item.label}
                          meta={item.minutes ? `${minutesLabel(item.minutes)}${item.tier ? ` · Tier ${item.tier}` : ''}` : undefined}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 py-2 text-[12.5px] text-t2">
                      <CheckCircle2 size={15} className="mt-0.5 flex-none text-good" aria-hidden />
                      <p>
                        {modeTotal > 0
                          ? `All ${mode} checks are done. Switch mode for the other block, or open the week and run the gate.`
                          : 'No checks in this mode yet. Open the week to add some.'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between rounded-xl border border-line bg-s1 p-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="eyebrow">Mastery gate</p>
                      {week.gate.passedAt ? (
                        <Badge tone="good" icon={<CheckCircle2 size={11} />}>
                          Cleared {formatShortDate(week.gate.passedAt)}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Not cleared</Badge>
                      )}
                    </div>
                    <p className="muted mt-1.5 line-clamp-3 text-[12px] leading-relaxed">
                      {week.gate.notes ??
                        'Four sliders: concept, implementation, craft, debugging. Average ≥4.0, nothing below 3.'}
                    </p>
                    <div className="mt-2.5 grid grid-cols-4 gap-1">
                      {(['concept', 'implementation', 'craft', 'debugging'] as const).map((key) => (
                        <div key={key} className="rounded-md bg-s2 px-1.5 py-1 text-center">
                          <p className="faint text-[8.5px] tracking-wide">{key.slice(0, 4)}</p>
                          <p className="num text-[12px] font-semibold">{week.gate.scores?.[key] ?? '—'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`#/week/${week.id}`)}
                      trailingIcon={<ArrowRight size={13} />}
                    >
                      Open week {week.weekNumber}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Network size={13} />}
                      onClick={() => navigate('#/nodes')}
                    >
                      Nodes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<CalendarCheck2 size={18} />}
              title="No weeks in this track yet"
              description="Add Week 1 with outcomes, checks and a blind gate to start the engine."
              action={<Button variant="primary" onClick={() => navigate('#/curriculum')}>Open curriculum</Button>}
            />
          )}
        </section>

        {/* daily rhythm */}
        <section className="card card-pad col-span-2 lg:col-span-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="eyebrow">Daily rhythm · {mode}</p>
              <h2 className="h2 mt-1 flex items-baseline gap-2">
                <span className="num text-[1.55rem]">{streak.current}</span>
                <span className="muted text-[12px] font-medium">day core streak</span>
              </h2>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-warn-soft text-warn" aria-hidden>
              <Flame size={17} />
            </span>
          </div>

          <div className="mt-3 flex items-end gap-1.5" aria-label="Last seven days">
            {dots.map((dot) => (
              <div key={dot.key} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="grid h-7 w-full place-items-center rounded-md border text-[11px] font-semibold"
                  style={{
                    background: dot.core > 0 ? 'var(--accent-soft)' : 'var(--surface-2)',
                    borderColor: dot.core > 0 ? 'color-mix(in srgb, var(--accent) 24%, transparent)' : 'var(--border)',
                    color: dot.core > 0 ? 'var(--accent-strong)' : 'var(--text-3)',
                  }}
                  title={`${dot.key}: ${dot.core} core blocks`}
                >
                  {dot.core > 0 ? dot.core : '·'}
                </div>
                <span className="faint text-[11px]">{dot.weekday}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <ProgressBar value={rhythmItems.length ? rhythmDone / rhythmItems.length : 0} className="flex-1" />
            <span className="num faint text-[11.5px]">
              {rhythmDone}/{rhythmItems.length}
            </span>
          </div>

          <div className="mt-2.5 space-y-1.5">
            {rhythmItems.map((item) => (
              <CheckRow
                key={item.id}
                checked={todayItems.includes(item.id)}
                onToggle={() => toggleDailyItem(item.id)}
                label={item.label}
                meta={`${minutesLabel(item.minutes)}${item.mode === 'both' ? ' · any context' : ''}`}
              />
            ))}
          </div>
        </section>

        {/* stats */}
        <div className="col-span-1 lg:col-span-3">
          <Stat
            label="Graph mastery"
            value={`${percent(overallMastery(subject.nodes))}%`}
            meta={`${stats.mastered}/${subject.nodes.length} nodes proven`}
            icon={<GitBranch size={14} />}
            tone="accent"
            onClick={() => navigate('#/nodes')}
          />
        </div>
        <div className="col-span-1 lg:col-span-3">
          <Stat
            label="Gates cleared"
            value={`${stats.gates}/${subject.weeks.length}`}
            meta={`${subject.weeks.length - stats.gates} weeks remaining`}
            icon={<Lock size={14} />}
            tone="good"
            onClick={() => navigate('#/curriculum')}
          />
        </div>
        <div className="col-span-1 lg:col-span-3">
          <Stat
            label="Recall queue"
            value={stats.due.length}
            meta={`${stats.fresh.length} new cards unscheduled`}
            icon={<BrainCircuit size={14} />}
            tone="info"
            onClick={() => navigate('#/recall')}
          />
        </div>
        <div className="col-span-1 lg:col-span-3">
          <Stat
            label="Repair drills"
            value={stats.repair.length}
            meta={`${activeRepairCount} active prerequisite flag${activeRepairCount === 1 ? '' : 's'}`}
            icon={<Wrench size={14} />}
            tone={stats.repair.length ? 'bad' : 'neutral'}
            onClick={() => navigate('#/nodes')}
          />
        </div>

        {/* graph pulse */}
        <section className="card card-pad col-span-2 lg:col-span-4">
          <SectionHead
            title="Graph pulse"
            eyebrow="Knowledge state"
            action={
              <button type="button" className="link text-[11.5px]" onClick={() => navigate('#/nodes')}>
                Open graph
              </button>
            }
          />
          {subject.nodes.length === 0 ? (
            <EmptyState
              compact
              icon={<Orbit size={16} />}
              title="The graph is empty"
              description="Create a primitive → concept → failure-mode node in the first week."
              action={<Button size="sm" variant="soft" onClick={() => navigate('#/nodes')}>Add a node</Button>}
            />
          ) : (
            <>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-s2" aria-hidden>
                {(
                  [
                    ['mastered', 'var(--good)'],
                    ['learning', 'var(--info)'],
                    ['ready', 'var(--accent)'],
                    ['repair', 'var(--bad)'],
                    ['locked', 'var(--surface-3)'],
                  ] as const
                ).map(([key, colour]) => {
                  const count = stats.badgeCounts[key]
                  const width = (count / subject.nodes.length) * 100
                  return width > 0 ? (
                    <span key={key} style={{ width: `${width}%`, background: colour }} title={`${key}: ${count}`} />
                  ) : null
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {(
                  [
                    ['Mastered', stats.badgeCounts.mastered, 'text-good', <CheckCircle2 key="m" size={13} />],
                    ['Learning', stats.badgeCounts.learning, 'text-info', <CircleDot key="l" size={13} />],
                    ['Ready', stats.badgeCounts.ready, 'text-accent', <Sparkles key="r" size={13} />],
                    ['Repair', stats.badgeCounts.repair, 'text-bad', <Wrench key="x" size={13} />],
                    ['Locked', stats.badgeCounts.locked, 'text-t3', <Lock key="k" size={13} />],
                  ] as const
                ).map(([label, count, colour, icon]) => (
                  <div key={label} className="flex items-center gap-1.5 text-[11.5px]">
                    <span className={colour}>{icon}</span>
                    <span className="muted flex-1">{label}</span>
                    <span className="num font-semibold">{count}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-line bg-s2 px-2.5 py-2">
                <p className="faint text-[11.5px]">
                  {stats.badgeCounts.mastered === subject.nodes.length
                    ? 'Every node proven. This graph is closed — defend it blind.'
                    : `${subject.nodes.length - stats.badgeCounts.mastered} nodes remain unproven. Only a blind gate clears a week.`}
                </p>
              </div>
            </>
          )}
        </section>

        {/* canon */}
        <section className="card card-pad col-span-2 lg:col-span-4">
          <SectionHead
            title="The 30-minute canon"
            eyebrow="Passive input"
            action={
              <button type="button" className="link text-[11.5px]" onClick={() => navigate('#/vault')}>
                Vault
              </button>
            }
          />
          <div className="space-y-2.5">
            {shownBooks.map((book) => (
              <div key={book.id} className="rounded-xl border border-line bg-s1 p-2.5">
                <div className="flex items-start gap-2">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-md bg-s2 text-t2">
                    <BookOpen size={13} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold">{book.title}</p>
                    <p className="faint truncate text-[11.5px]">{book.pillar}</p>
                  </div>
                  <button
                    type="button"
                    className="num flex-none rounded-md border border-line bg-s2 px-1.5 py-0.5 text-[11px] font-semibold hover:border-line-strong"
                    onClick={() =>
                      updateBook(book.id, {
                        currentChapter: Math.min(book.totalChapters, book.currentChapter + 1),
                        status: book.currentChapter + 1 >= book.totalChapters ? 'done' : 'reading',
                      })
                    }
                    aria-label={`Mark one chapter of ${book.title} read`}
                    title="Mark one chapter read"
                  >
                    +1
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar
                    value={book.totalChapters ? book.currentChapter / book.totalChapters : 0}
                    tone={book.status === 'done' ? 'good' : 'accent'}
                    className="!h-1.5 flex-1"
                  />
                  <span className="faint num text-[11px]">
                    {book.currentChapter}/{book.totalChapters}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate('#/vault')}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-1.5 text-[11px] text-t3 hover:border-line-strong hover:text-t2"
          >
            <Library size={12} /> Manage the canon
          </button>
        </section>

        {/* prompt */}
        <section className="card card-pad col-span-2 flex flex-col lg:col-span-4">
          <SectionHead
            title="Prompt of the day"
            eyebrow="Generation over consumption"
            action={<Badge tone="info">{prompt.category}</Badge>}
          />
          <div className="flex flex-1 flex-col">
            <div className="rounded-xl border border-line bg-s2 p-3">
              <p className="text-[13px] font-semibold">{prompt.title}</p>
              <p className="muted mt-1 text-[12px] leading-relaxed">{prompt.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {prompt.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="pill !py-0.5 !text-[11px]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <p className="prose-mh mt-3 line-clamp-3 text-[12px] whitespace-pre-line opacity-80">
              {prompt.template.split('\n').slice(0, 4).join('\n')}
            </p>
            <div className="mt-auto pt-3">
              <Button
                variant="soft"
                size="sm"
                className="w-full"
                icon={<Sparkles size={13} />}
                onClick={() => navigate('#/recall')}
              >
                Open prompt hub
              </Button>
            </div>
          </div>
        </section>

        {/* repair or formula */}
        {repairs.length > 0 ? (
          <section className="card card-pad col-span-2 border-bad/25 lg:col-span-8">
            <SectionHead
              title="30-minute repair drills needed"
              eyebrow="Two failures on a knowledge point"
              action={
                <Button size="sm" variant="outline" onClick={() => navigate('#/nodes')} trailingIcon={<ArrowRight size={12} />}>
                  Repair queue
                </Button>
              }
            />
            <p className="muted mb-3 text-[12.5px]">
              A second failure flags every direct prerequisite for an explicit drill. Clear the flag only after
              a closed-book repair, never by checking a box.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {repairs.map((node) => {
                const flags = activeFlags(node)
                const weekOf = subject.weeks.find((entry) => entry.id === node.weekId)
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => navigate(`#/node/${node.id}`)}
                    className="card card-hover rounded-xl p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="eyebrow">W{weekOf?.weekNumber ?? '?'}</span>
                      <Wrench size={13} className="text-bad" aria-hidden />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] font-semibold">{node.title}</p>
                    <p className="faint mt-1 text-[11.5px]">
                      {node.status === 'needs-repair' ? 'Second failure on this node' : `${flags.length} repair flag${flags.length === 1 ? '' : 's'} active`}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="card card-pad col-span-2 overflow-hidden lg:col-span-8">
            <SectionHead title="The operating system" eyebrow="Non-negotiable" />
            <div className="rounded-xl border border-accent/20 bg-accent-soft p-3.5">
              <p className="text-[13px] leading-relaxed font-semibold text-t1">{SKILL_FORMULA.line1}</p>
              <p className="num muted mt-2 text-[11.5px] leading-relaxed">{SKILL_FORMULA.line2}</p>
            </div>
            <p className="muted mt-2.5 text-[12px] leading-relaxed">{SKILL_FORMULA.note}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['1', 'Primitive', 'Name it from memory'],
                ['2', 'Generate', 'Paper before IDE'],
                ['3', 'Break', 'Trigger the failure'],
                ['4', 'Gate', 'Closed book, no AI'],
              ].map(([n, title, detail]) => (
                <div key={n} className="rounded-lg border border-line bg-s2 p-2">
                  <span className="num text-[11px] font-bold text-accent">{n}</span>
                  <p className="mt-0.5 text-[11.5px] font-semibold">{title}</p>
                  <p className="faint text-[11px]">{detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* parking lot */}
        <section className="card card-pad col-span-2 lg:col-span-4">
          <SectionHead title="Parking lot" eyebrow="Deliberately ignored" />
          {week && week.rabbitHoles.length > 0 ? (
            <ul className="space-y-2">
              {week.rabbitHoles.map((item) => (
                <li key={item} className="flex items-start gap-2 rounded-lg border border-line bg-s2 px-2.5 py-2">
                  <Lock size={12} className="mt-0.5 flex-none text-t3" aria-hidden />
                  <span className="muted text-[11.5px] leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted text-[12.5px]">
              No rabbit holes recorded. Add the tempting detours to the week so they stay out of the critical
              path until they earn a slot.
            </p>
          )}
          <div className="mt-3 rounded-lg border border-line border-dashed px-2.5 py-2">
            <p className="faint text-[11.5px] leading-relaxed">
              Rule: if it is not in the current week's gate, it is a parked idea — not a side quest.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

