import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  Lock,
  Pencil,
  Plus,
  ShieldQuestion,
  Sparkles,
  Target,
  Trash2,
  Unlock,
  Wrench,
  X,
} from 'lucide-react'
import type { MasteryScores, Week } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import {
  missingWeekPrereqs,
  isWeekAvailable,
  nodeBadge,
  weekEncompassedNodes,
  weekProgress,
  weekStatus,
} from '../../engine/gating'
import { activeFlags } from '../../engine/remediation'
import { emptyScores, evaluateGate } from '../../engine/mastery'
import { MASTERY_CATEGORIES, formatShortDate, minutesLabel } from '../../lib/dates'
import { cn, percent } from '../../lib/utils'
import { navigate } from '../../lib/router'
import { Sheet } from '../../components/ui/Sheet'
import {
  Alert,
  Badge,
  Button,
  CheckRow,
  EmptyState,
  Field,
  InlineError,
  NodeBadgePill,
  ProgressBar,
  SectionHead,
  Tabs,
  WeekBadge,
} from '../../components/ui/primitives'
import { NodeEditorForm } from '../nodes/NodeEditorForm'

type WeekTab = 'plan' | 'gate' | 'edit'
type CheckFilter = 'all' | 'passive' | 'active'

export function WeekSheet({ weekId, onClose }: { weekId: string; onClose: () => void }) {
  const subject = useActiveSubject()
  const overrides = useAppStore((state) => state.overrides)
  const mode = useAppStore((state) => state.prefs.mode)
  const toggleChecklist = useAppStore((state) => state.toggleChecklist)
  const saveGate = useAppStore((state) => state.saveGate)
  const unlockWeek = useAppStore((state) => state.unlockWeek)
  const clearOverride = useAppStore((state) => state.clearOverride)
  const toast = useUiStore((state) => state.toast)

  const week = subject.weeks.find((entry) => entry.id === weekId)
  const [tab, setTab] = useState<WeekTab>('plan')
  const [checkFilter, setCheckFilter] = useState<CheckFilter>(mode)
  const [addingNode, setAddingNode] = useState(false)
  const [scores, setScores] = useState<MasteryScores>(() => week?.gate.scores ?? emptyScores(3))
  const [confirmUnlock, setConfirmUnlock] = useState(false)

  useEffect(() => {
    if (!week) return
    setScores(week.gate.scores ?? emptyScores(3))
    setCheckFilter(mode)
    setTab('plan')
    setAddingNode(false)
    setConfirmUnlock(false)
  }, [week?.id])

  const phase = subject.phases.find((entry) => entry.id === week?.phaseId)
  const nodes = useMemo(
    () => (week ? subject.nodes.filter((node) => node.weekId === week.id) : []),
    [subject.nodes, week],
  )
  const resources = useMemo(
    () => (week ? subject.resources.filter((resource) => resource.weekId === week.id) : []),
    [subject.resources, week],
  )
  const encompassed = useMemo(
    () => (week ? weekEncompassedNodes(week, subject.nodes) : []),
    [week, subject.nodes],
  )

  if (!week) return null

  const status = weekStatus(week, subject.weeks, overrides)
  const progress = weekProgress(week)
  const available = isWeekAvailable(week, subject.weeks, overrides)
  const overridden = Boolean(overrides.weeks[week.id])
  const missing = missingWeekPrereqs(week, subject.weeks)
  const evaluation = evaluateGate(scores)
  const filteredChecks = week.checklist.filter(
    (item) => checkFilter === 'all' || item.context === checkFilter,
  )
  const done = filteredChecks.filter((item) => item.done).length
  const completedNodes = nodes.filter((node) => node.status === 'mastered').length

  const handleSaveGate = () => {
    const result = saveGate(week.id, scores)
    toast(result.message, result.ok ? 'success' : 'error', result.ok ? 5000 : 3800)
  }

  return (
    <Sheet
      title={`Week ${week.weekNumber} · ${week.title}`}
      eyebrow={`${phase?.name ?? 'Phase'} · ${subject.shortName}`}
      onClose={onClose}
      headerExtra={<WeekBadge status={status} />}
      footer={
        <>
          <span className="faint mr-auto hidden text-[11px] sm:block">
            {completedNodes}/{nodes.length} nodes proven · {percent(progress)}% checks
          </span>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="soft" onClick={() => navigate('#/map')} icon={<Target size={14} />}>
            Open graph
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">Week {week.weekNumber}</Badge>
            {week.capstone ? <Badge tone="warn">Capstone</Badge> : null}
            {overridden ? <Badge tone="warn">Override active</Badge> : null}
            {!available && !overridden ? (
              <Badge tone="neutral" icon={<Lock size={11} />}>
                Locked
              </Badge>
            ) : null}
          </div>
          <p className="muted mt-3 border-l-2 border-accent/60 pl-3 text-[13px] leading-relaxed">
            {week.anchor}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <ProgressBar value={progress} className="flex-1" />
            <span className="num faint text-[10.5px]">{percent(progress)}%</span>
          </div>
        </div>

        <Tabs
          items={[
            { id: 'plan', label: 'Plan', count: week.checklist.filter((item) => !item.done).length },
            { id: 'gate', label: 'Mastery gate' },
            { id: 'edit', label: 'Week settings' },
          ]}
          value={tab}
          onChange={(value) => setTab(value as WeekTab)}
        />

        {tab === 'plan' ? (
          <div className="space-y-5">
            <section>
              <SectionHead title="Outcomes" eyebrow="What this week must prove" />
              {week.outcomes.length > 0 ? (
                <ul className="space-y-1.5">
                  {week.outcomes.map((outcome) => (
                    <li key={outcome} className="flex items-start gap-2 text-[12.5px] text-t2">
                      <CheckCircle2 size={14} className="mt-0.5 flex-none text-accent" aria-hidden />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="faint text-[12px]">No outcomes written. Add them in Week settings.</p>
              )}
            </section>

            <section>
              <SectionHead
                title="Knowledge nodes"
                eyebrow={`${completedNodes}/${nodes.length} mastered`}
                action={
                  <Button
                    size="sm"
                    variant={addingNode ? 'ghost' : 'soft'}
                    icon={addingNode ? <X size={13} /> : <Plus size={13} />}
                    onClick={() => setAddingNode((value) => !value)}
                  >
                    {addingNode ? 'Cancel' : 'Add node'}
                  </Button>
                }
              />
              {addingNode ? (
                <div className="rounded-xl border border-accent/25 bg-s1 p-3">
                  <p className="mb-3 text-[12px] font-semibold">New knowledge node</p>
                  <NodeEditorForm
                    subject={subject}
                    weekId={week.id}
                    onDone={() => setAddingNode(false)}
                    onCancel={() => setAddingNode(false)}
                    compact
                  />
                </div>
              ) : null}
              {nodes.length === 0 ? (
                <EmptyState
                  compact
                  icon={<Target size={16} />}
                  title="No knowledge nodes in this week"
                  description="A week is proven through nodes: primitive, concept, failure mode. Add the first one."
                  action={
                    !addingNode ? (
                      <Button size="sm" variant="soft" icon={<Plus size={12} />} onClick={() => setAddingNode(true)}>
                        Add the first node
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-1.5">
                  {nodes.map((node) => {
                    const badge = nodeBadge(node, subject, overrides)
                    const flags = activeFlags(node)
                    const kp = node.knowledgePoints[0]
                    const weekOf = subject.weeks.find((entry) => entry.id === node.weekId)
                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => navigate(`#/node/${node.id}`)}
                        className="card card-hover w-full rounded-xl p-3 text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <NodeBadgePill status={badge} />
                              {flags.length > 0 ? (
                                <Badge tone="bad" icon={<Wrench size={10} />}>
                                  {flags.length} repair
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-1.5 text-[12.5px] font-semibold">{node.title}</p>
                            {kp ? <p className="muted mt-0.5 line-clamp-2 text-[11px]">{kp.primitive}</p> : null}
                          </div>
                          <ArrowUpRight size={14} className="mt-1 flex-none text-t3" aria-hidden />
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="rail !h-1.5 flex-1">
                            <span style={{ width: `${(node.srs.strength / 5) * 100}%` }} />
                          </div>
                          <span className="faint num text-[9.5px]">
                            W{weekOf?.weekNumber ?? '?'} · {node.srs.strength.toFixed(1)}/5 · {node.srs.implicitReviews} FIRe
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

            <section>
              <SectionHead
                title="Daily checks"
                eyebrow="Passive / active context"
                action={
                  <Tabs
                    items={[
                      { id: 'all', label: 'All' },
                      { id: 'passive', label: 'Passive' },
                      { id: 'active', label: 'Active' },
                    ]}
                    value={checkFilter}
                    onChange={(value) => setCheckFilter(value as CheckFilter)}
                  />
                }
              />
              <div className="flex items-center gap-2">
                <ProgressBar value={filteredChecks.length ? done / filteredChecks.length : 0} className="flex-1" />
                <span className="num faint text-[10.5px]">
                  {done}/{filteredChecks.length}
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {filteredChecks.map((item) => (
                  <CheckRow
                    key={item.id}
                    checked={item.done}
                    onToggle={() => toggleChecklist(week.id, item.id)}
                    label={item.label}
                    meta={[
                      item.context,
                      item.tier ? `Tier ${item.tier}` : '',
                      item.minutes ? minutesLabel(item.minutes) : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                ))}
                {filteredChecks.length === 0 ? (
                  <p className="faint py-3 text-center text-[12px]">No checks in this context.</p>
                ) : null}
              </div>
            </section>

            <section>
              <SectionHead title="Canon & capstone" eyebrow="30 minutes per day" />
              <div className="space-y-2">
                <div className="rounded-xl border border-line bg-s2 p-3">
                  <div className="flex items-start gap-2">
                    <BookOpen size={14} className="mt-0.5 flex-none text-t2" aria-hidden />
                    <div>
                      <p className="text-[12px] font-semibold">Book focus</p>
                      <p className="muted mt-0.5 text-[11.5px]">{week.bookFocus || 'No canon assigned.'}</p>
                    </div>
                  </div>
                </div>
                {week.capstone ? (
                  <div className="rounded-xl border border-warn/25 bg-warn-soft p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles size={14} className="mt-0.5 flex-none text-warn" aria-hidden />
                      <div>
                        <p className="text-[12px] font-semibold text-warn">Capstone</p>
                        <p className="muted mt-0.5 text-[11.5px]">{week.capstone}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <section>
                <SectionHead title="Docs & resources" eyebrow={`${resources.length} linked`} />
                {resources.length === 0 ? (
                  <p className="faint text-[11.5px]">
                    No resources for this week. Add them from the Vault.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {resources.map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start gap-2 rounded-lg border border-line bg-s1 p-2.5 transition hover:border-line-strong"
                      >
                        <FileText size={13} className="mt-0.5 flex-none text-t2" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-medium">{resource.title}</span>
                          <span className="faint block text-[10px] capitalize">{resource.kind} · {resource.status}</span>
                        </span>
                        <ExternalLink size={11} className="mt-0.5 flex-none text-t3" aria-hidden />
                      </a>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <SectionHead title="Implicit repetition" eyebrow="FIRe links" />
                {encompassed.length === 0 ? (
                  <p className="faint text-[11.5px]">
                    This week's gate does not explicitly credit older nodes yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {encompassed.map((node) => {
                      const weekOf = subject.weeks.find((entry) => entry.id === node.weekId)
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => navigate(`#/node/${node.id}`)}
                          className="flex w-full items-start gap-2 rounded-lg border border-line bg-s1 p-2.5 text-left transition hover:border-line-strong"
                        >
                          <Sparkles size={12} className="mt-0.5 flex-none text-accent" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11.5px] font-medium">{node.title}</span>
                            <span className="faint block text-[10px]">
                              Week {weekOf?.weekNumber ?? '?'} · strength {node.srs.strength.toFixed(1)}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>

            <section>
              <SectionHead title="Parking lot" eyebrow="Do not rabbit hole" />
              {week.rabbitHoles.length > 0 ? (
                <ul className="space-y-1.5">
                  {week.rabbitHoles.map((hole) => (
                    <li key={hole} className="flex items-start gap-2 text-[12px] text-t2">
                      <Lock size={12} className="mt-0.5 flex-none text-t3" aria-hidden />
                      {hole}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="faint text-[12px]">No rabbit holes recorded.</p>
              )}
            </section>
          </div>
        ) : null}

        {tab === 'gate' ? (
          <div className="space-y-4">
            <section className="rounded-xl border border-line bg-s2 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Closed-book challenge</p>
                  <p className="mt-1 text-[12.5px] font-semibold">
                    Average ≥ 4.0, and no category below 3.
                  </p>
                </div>
                <Badge tone={week.gate.passedAt ? 'good' : 'neutral'}>
                  {week.gate.passedAt ? `Cleared ${formatShortDate(week.gate.passedAt)}` : 'Not cleared'}
                </Badge>
              </div>
              <p className="muted mt-2 text-[12px] leading-relaxed">
                {week.gate.notes ||
                  'Run the week’s blind challenge first. Score what you actually demonstrated, not what you intended to learn.'}
              </p>
            </section>

            <div className="space-y-3">
              {MASTERY_CATEGORIES.map((category) => (
                <div key={category.key} className="rounded-xl border border-line bg-s1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[12.5px] font-semibold">{category.label}</p>
                      <p className="faint text-[10.5px]">{category.hint}</p>
                    </div>
                    <span className="num text-[15px] font-semibold">{scores[category.key]}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-1.5" role="group" aria-label={`${category.label} score`}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={scores[category.key] === value}
                        aria-label={`${category.label}: ${value} of 5`}
                        onClick={() => setScores((current) => ({ ...current, [category.key]: value } as MasteryScores))}
                        className={cn(
                          'grid h-11 place-items-center rounded-lg border text-[12px] font-semibold transition',
                          scores[category.key] === value
                            ? 'border-accent bg-accent text-[var(--accent-contrast)]'
                            : 'border-line bg-s2 text-t2 hover:border-line-strong',
                        )}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-line bg-s2 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">Live evaluation</span>
                <Badge tone={evaluation.passed ? 'good' : evaluation.blockers.length ? 'warn' : 'neutral'}>
                  Average {evaluation.average.toFixed(1)}
                </Badge>
              </div>
              <p className="muted mt-1.5 text-[12px]">
                {evaluation.passed
                  ? 'This attempt clears the gate. Save it to unlock the next week.'
                  : evaluation.blockers.length
                    ? evaluation.blockers.join(' · ')
                    : 'Set all four scores to evaluate.'}
              </p>
              <Button
                variant="primary"
                className="mt-2.5 w-full"
                icon={<CheckCircle2 size={14} />}
                onClick={handleSaveGate}
                disabled={Boolean(week.gate.passedAt)}
              >
                {week.gate.passedAt ? 'Gate already cleared' : 'Save gate attempt'}
              </Button>
            </div>

            {week.gate.attempts.length > 0 ? (
              <section>
                <SectionHead title="Attempt history" eyebrow="Last 12 attempts" />
                <div className="space-y-1.5">
                  {[...week.gate.attempts].reverse().map((attempt, index) => (
                    <div
                      key={`${attempt.at}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-line bg-s1 px-2.5 py-2"
                    >
                      <div>
                        <p className="text-[11.5px] font-medium">
                          {formatShortDate(attempt.at)} · average {attempt.average.toFixed(1)}
                        </p>
                        <p className="faint num text-[10px]">
                          C{attempt.scores.concept} · I{attempt.scores.implementation} · X{attempt.scores.craft} · D
                          {attempt.scores.debugging}
                        </p>
                      </div>
                      <Badge tone={attempt.passed ? 'good' : 'neutral'}>
                        {attempt.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {(missing.length > 0 && !overridden) || overridden ? (
              <section>
                <SectionHead title="Week access" eyebrow="Audited override" />
                {missing.length > 0 && !overridden ? (
                  <Alert
                    tone="warn"
                    icon={<ShieldQuestion size={16} />}
                    title="This week is still locked"
                  >
                    <p>
                      Earlier gates must clear first:{' '}
                      {missing.map((entry) => `Week ${entry.weekNumber}`).join(', ')}. The calendar does not
                      unlock weeks.
                    </p>
                    {confirmUnlock ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<Unlock size={13} />}
                          onClick={() => {
                            unlockWeek(week.id)
                            setConfirmUnlock(false)
                            toast(`Week ${week.weekNumber} unlocked with an audited override.`, 'info')
                          }}
                        >
                          Confirm unlock
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmUnlock(false)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        icon={<Unlock size={13} />}
                        onClick={() => setConfirmUnlock(true)}
                      >
                        Unlock anyway
                      </Button>
                    )}
                  </Alert>
                ) : overridden ? (
                  <Alert
                    tone="info"
                    icon={<Unlock size={16} />}
                    title="Manual override is active"
                  >
                    <p>This week was opened without clearing its prerequisite gate. The override is recorded in your backup.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        clearOverride('week', week.id)
                        toast('Week override removed.', 'info')
                      }}
                    >
                      Remove override
                    </Button>
                  </Alert>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === 'edit' ? <WeekEditForm week={week} onClose={onClose} /> : null}
      </div>
    </Sheet>
  )
}

function WeekEditForm({ week, onClose }: { week: Week; onClose: () => void }) {
  const subject = useActiveSubject()
  const updateWeek = useAppStore((state) => state.updateWeek)
  const deleteWeek = useAppStore((state) => state.deleteWeek)
  const toast = useUiStore((state) => state.toast)

  const [phaseId, setPhaseId] = useState(week.phaseId)
  const [title, setTitle] = useState(week.title)
  const [anchor, setAnchor] = useState(week.anchor)
  const [bookFocus, setBookFocus] = useState(week.bookFocus)
  const [capstone, setCapstone] = useState(week.capstone ?? '')
  const [gateNotes, setGateNotes] = useState(week.gate.notes ?? '')
  const [outcomes, setOutcomes] = useState(week.outcomes.join('\n'))
  const [rabbitHoles, setRabbitHoles] = useState(week.rabbitHoles.join('\n'))
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('The week needs a title.')
      return
    }
    updateWeek(week.id, {
      phaseId,
      title: title.trim(),
      anchor: anchor.trim(),
      bookFocus: bookFocus.trim(),
      capstone: capstone.trim() || undefined,
      outcomes: outcomes
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      rabbitHoles: rabbitHoles
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      gate: { ...week.gate, notes: gateNotes.trim() || undefined },
    })
    toast('Week updated.', 'success')
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <Field label="Phase">
          <select className="select" value={phaseId} onChange={(event) => setPhaseId(event.target.value)}>
            {subject.phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </Field>
      </div>

      <Field label="First-principles anchor" hint="One sentence. What must become obvious by Sunday.">
        <textarea
          className="textarea min-h-[80px]"
          value={anchor}
          onChange={(event) => setAnchor(event.target.value)}
        />
      </Field>

      <Field label="Outcomes" hint="One per line.">
        <textarea
          className="textarea min-h-[92px]"
          value={outcomes}
          onChange={(event) => setOutcomes(event.target.value)}
        />
      </Field>

      <Field label="Rabbit holes" hint="One per line. These stay parked until their real week.">
        <textarea
          className="textarea min-h-[70px]"
          value={rabbitHoles}
          onChange={(event) => setRabbitHoles(event.target.value)}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Book focus">
          <input className="input" value={bookFocus} onChange={(event) => setBookFocus(event.target.value)} />
        </Field>
        <Field label="Capstone (optional)">
          <input
            className="input"
            value={capstone}
            onChange={(event) => setCapstone(event.target.value)}
            placeholder="e.g. Capstone 2: offline-first app"
          />
        </Field>
      </div>

      <Field label="Gate challenge notes" hint="Shown on the gate tab. Write the closed-book challenge.">
        <textarea
          className="textarea min-h-[80px]"
          value={gateNotes}
          onChange={(event) => setGateNotes(event.target.value)}
        />
      </Field>

      {error ? <InlineError>{error}</InlineError> : null}

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 size={13} />}
          onClick={() => {
            if (window.confirm(`Delete Week ${week.weekNumber} and all of its nodes and cards? This cannot be undone.`)) {
              deleteWeek(week.id)
              toast(`Week ${week.weekNumber} deleted.`, 'info')
              onClose()
            }
          }}
        >
          Delete week
        </Button>
        <Button variant="primary" type="submit" icon={<Pencil size={13} />}>
          Save week
        </Button>
      </div>
    </form>
  )
}
