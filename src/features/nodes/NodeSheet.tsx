import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Lock,
  Pencil,
  Sparkles,
  Trash2,
  Unlock,
  Wrench,
} from 'lucide-react'
import type { KnowledgePoint } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import {
  isNodeOpen,
  isWeekAvailable,
  missingNodePrereqs,
  missingWeekPrereqs,
  nodeBadge,
} from '../../engine/gating'
import { activeFlags } from '../../engine/remediation'
import { strengthLabel } from '../../engine/fire'
import { formatDateTime, relativeDays } from '../../lib/dates'
import { cn } from '../../lib/utils'
import { navigate } from '../../lib/router'
import { Sheet } from '../../components/ui/Sheet'
import {
  Alert,
  Badge,
  Button,
  NodeBadgePill,
  ProgressBar,
  SectionHead,
} from '../../components/ui/primitives'
import { NodeEditorForm } from './NodeEditorForm'

export function NodeSheet({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const subject = useActiveSubject()
  const overrides = useAppStore((state) => state.overrides)
  const startNode = useAppStore((state) => state.startNode)
  const markNodeMastered = useAppStore((state) => state.markNodeMastered)
  const logNodeReview = useAppStore((state) => state.logNodeReview)
  const failKnowledgePoint = useAppStore((state) => state.failKnowledgePoint)
  const clearRepair = useAppStore((state) => state.clearRepair)
  const unlockNode = useAppStore((state) => state.unlockNode)
  const clearOverride = useAppStore((state) => state.clearOverride)
  const updateNode = useAppStore((state) => state.updateNode)
  const deleteNode = useAppStore((state) => state.deleteNode)
  const restoreTrash = useAppStore((state) => state.restoreTrash)
  const toast = useUiStore((state) => state.toast)

  const node = subject.nodes.find((entry) => entry.id === nodeId)
  const week = subject.weeks.find((entry) => entry.id === node?.weekId)
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(node?.notes ?? '')
  const [confirmKp, setConfirmKp] = useState<string | null>(null)
  const [confirmUnlock, setConfirmUnlock] = useState(false)

  useEffect(() => {
    setEditing(false)
    setNotes(node?.notes ?? '')
    setConfirmKp(null)
    setConfirmUnlock(false)
  }, [node?.id])

  const missingPrereqs = useMemo(
    () => (node ? missingNodePrereqs(node, subject.nodes) : []),
    [node, subject.nodes],
  )
  const missingWeeks = useMemo(
    () => (week ? missingWeekPrereqs(week, subject.weeks) : []),
    [week, subject.weeks],
  )

  if (!node) return null

  const badge = nodeBadge(node, subject, overrides)
  const open = isNodeOpen(node, subject, overrides)
  const weekOpen = week ? isWeekAvailable(week, subject.weeks, overrides) : false
  const flags = activeFlags(node)
  const overridden = Boolean(overrides.nodes[node.id])
  const failing = node.knowledgePoints.filter((point) => point.fails >= 2)
  const prerequisites = node.prerequisiteIds
    .map((id) => subject.nodes.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  const encompassed = node.encompassedNodeIds
    .map((id) => subject.nodes.find((entry) => entry.id === id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  const masteredPrereqs = prerequisites.filter((entry) => entry.status === 'mastered').length

  const handleStart = () => {
    startNode(node.id)
    toast('Node started. Build the first slice from paper.', 'info')
  }

  const handleMaster = () => {
    const result = markNodeMastered(node.id)
    toast(result.message, result.ok ? 'success' : 'error', result.ok ? 5000 : 3800)
  }

  const handleReview = () => {
    const result = logNodeReview(node.id)
    toast(result.message, result.ok ? 'success' : 'error')
  }

  const handleFailure = (point: KnowledgePoint) => {
    const result = failKnowledgePoint(node.id, point.id)
    setConfirmKp(null)
    toast(result.message, result.ok ? 'info' : 'error', 5200)
  }

  return (
    <Sheet
      title={node.title}
      eyebrow={
        week
          ? `Week ${week.weekNumber} · ${subject.phases.find((phase) => phase.id === week.phaseId)?.name ?? 'Phase'}`
          : 'Knowledge node'
      }
      onClose={onClose}
      headerExtra={<NodeBadgePill status={badge} />}
      footer={
        editing ? undefined : (
          <>
            <Button
              variant="ghost"
              icon={<Pencil size={13} />}
              className="mr-auto"
              onClick={() => setEditing(true)}
            >
              Edit node
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </>
        )
      }
    >
      {editing ? (
        <div>
          <NodeEditorForm
            subject={subject}
            node={node}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
          <div className="mt-6 rounded-xl border border-bad/25 bg-bad-soft p-3">
            <p className="text-[12px] font-semibold text-bad">Danger zone</p>
            <p className="muted mt-1 text-[11.5px]">
              Deleting this node removes it from prerequisite and FIRe links and unlinks its cards. The cards
              themselves stay in the deck.
            </p>
            <Button
              variant="danger"
              size="sm"
              className="mt-2"
              icon={<Trash2 size={13} />}
              onClick={() => {
                if (window.confirm(`Delete "${node.title}"? It moves to Recently deleted.`)) {
                  const trashEntryId = deleteNode(node.id)
                  if (trashEntryId) {
                    toast(
                      `Node "${node.title}" moved to Recently deleted.`,
                      'info',
                      8000,
                      {
                        label: 'Undo',
                        onClick: () => {
                          restoreTrash(trashEntryId)
                        },
                      }
                    )
                  }
                  onClose()
                }
              }}
            >
              Delete node
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {node.tags.map((tag) => (
              <span key={tag} className="pill !py-0.5 !text-[11px]">
                {tag}
              </span>
            ))}
            {overridden ? <Badge tone="warn">Manual override</Badge> : null}
            {failing.length > 0 ? <Badge tone="bad">Repair required</Badge> : null}
          </div>

          <div className="rounded-xl border border-line bg-s2 p-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="eyebrow">Strength</p>
                <p className="num mt-0.5 text-[16px] font-semibold">{node.srs.strength.toFixed(1)}/5</p>
                <p className="faint text-[11px]">{strengthLabel(node.srs.strength)}</p>
              </div>
              <div>
                <p className="eyebrow">Next review</p>
                <p className="mt-0.5 text-[12px] font-semibold">{relativeDays(node.srs.dueAt)}</p>
                <p className="faint text-[11px]">
                  {node.srs.intervalDays ? `${node.srs.intervalDays}d interval` : 'not scheduled'}
                </p>
              </div>
              <div>
                <p className="eyebrow">FIRe credit</p>
                <p className="num mt-0.5 text-[16px] font-semibold">{node.srs.implicitReviews}</p>
                <p className="faint text-[11px]">implicit reviews</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <ProgressBar
                value={node.srs.strength / 5}
                tone={failing.length ? 'bad' : node.status === 'mastered' ? 'good' : 'accent'}
                className="flex-1"
                label={`${node.title} strength`}
              />
              <span className="faint num text-[11px]">explicit +0.5–1.0</span>
            </div>
          </div>

          {!weekOpen && week ? (
            <Alert tone="warn" icon={<Lock size={16} />} title={`Week ${week.weekNumber} is still locked`}>
              <p>
                This node cannot open until the week is available. Clear{' '}
                {missingWeeks.length ? missingWeeks.map((entry) => `Week ${entry.weekNumber}`).join(' and ') : 'the earlier gate'}{' '}
                first.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                icon={<ArrowUpRight size={13} />}
                onClick={() => navigate(`#/plan/${week.id}`)}
              >
                Open Week {week.weekNumber}
              </Button>
            </Alert>
          ) : null}

          {weekOpen && !open && !overridden ? (
            <Alert tone="warn" icon={<Lock size={16} />} title="Prerequisites are not proven">
              <p>
                {missingPrereqs.length
                  ? `Master ${missingPrereqs.map((entry) => `“${entry.title}”`).join(', ')} first.`
                  : 'This node is gated by an unproven prerequisite.'}
              </p>
              {confirmUnlock ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Unlock size={13} />}
                    onClick={() => {
                      unlockNode(node.id)
                      setConfirmUnlock(false)
                      toast('Node unlocked with an audited override.', 'info')
                    }}
                  >
                    Confirm unlock
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmUnlock(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-2" icon={<Unlock size={13} />} onClick={() => setConfirmUnlock(true)}>
                  Unlock anyway
                </Button>
              )}
            </Alert>
          ) : null}

          {overridden ? (
            <Alert tone="info" icon={<Unlock size={16} />} title="Node override is active">
              <p>This node was opened before its prerequisites were mastered. The override is stored in your backup.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  clearOverride('node', node.id)
                  toast('Node override removed.', 'info')
                }}
              >
                Remove override
              </Button>
            </Alert>
          ) : null}

          {failing.length > 0 ? (
            <Alert tone="bad" icon={<Wrench size={16} />} title="Second failure: 30-minute repair drill needed">
              <p>
                {failing.map((point) => `“${point.concept || point.primitive}”`).join(', ')} failed twice. Re-derive
                the primitive on paper, rebuild the smallest failing case, and prove it blind before marking this
                node mastered again.
              </p>
            </Alert>
          ) : null}

          {flags.length > 0 ? (
            <div className="rounded-xl border border-bad/25 bg-bad-soft p-3">
              <div className="flex items-start gap-2">
                <Wrench size={16} className="mt-0.5 flex-none text-bad" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-bad">Prerequisite repair requested</p>
                  <p className="muted mt-1 text-[11.5px] leading-relaxed">
                    A downstream node failed this prerequisite twice. Run the 30-minute drill, then clear the flag
                    explicitly. This is not a checkbox.
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {flags.map((flag) => {
                      const source = subject.nodes.find((entry) => entry.id === flag.fromNodeId)
                      const sourceKp = source?.knowledgePoints.find((point) => point.id === flag.kpId)
                      return (
                        <div key={flag.id} className="rounded-lg border border-bad/20 bg-s1 px-2.5 py-2">
                          <p className="text-[11.5px] font-medium">
                            From {source ? `“${source.title}”` : 'a downstream node'}
                          </p>
                          <p className="faint text-[11.5px]">
                            {sourceKp ? sourceKp.primitive : 'Knowledge point'} · flagged {formatDateTime(flag.at)}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-1.5"
                            icon={<CheckCircle2 size={12} />}
                            onClick={() => {
                              clearRepair(node.id, flag.id)
                              toast('Repair drill cleared and explicit review logged.', 'success')
                            }}
                          >
                            Drill done · clear flag
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-1.5">
            {open && node.status !== 'mastered' && node.status !== 'learning' && node.status !== 'needs-repair' ? (
              <Button variant="soft" size="sm" onClick={handleStart} icon={<Sparkles size={13} />}>
                Start learning
              </Button>
            ) : null}
            {open && node.status !== 'mastered' ? (
              <Button variant="primary" size="sm" onClick={handleMaster} icon={<CheckCircle2 size={13} />}>
                {node.status === 'needs-repair' ? 'Repair done · prove mastery' : 'Mark mastered'}
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={handleReview} icon={<Clock3 size={13} />}>
              Log explicit review
            </Button>
            {node.status === 'mastered' ? (
              <Badge tone="good" icon={<CheckCircle2 size={11} />}>
                Proven
              </Badge>
            ) : null}
          </div>

          <section>
            <SectionHead
              title="Knowledge points"
              eyebrow={`${node.knowledgePoints.length} × primitive → concept → failure`}
            />
            <div className="space-y-2.5">
              {node.knowledgePoints.map((point, index) => (
                <div key={point.id} className="rounded-xl border border-line bg-s1 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="eyebrow">Point {index + 1}</p>
                    <div className="flex items-center gap-1">
                      <Badge tone={point.fails >= 2 ? 'bad' : point.fails === 1 ? 'warn' : 'neutral'}>
                        {point.fails} fail{point.fails === 1 ? '' : 's'}
                      </Badge>
                      {point.fails >= 2 ? <Badge tone="bad">Drill</Badge> : null}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <KpRow letter="P" label="Primitive" text={point.primitive} />
                    <KpRow letter="C" label="Concept" text={point.concept} />
                    <KpRow letter="F" label="Failure mode" text={point.failureMode} />
                  </div>
                  {point.lastFailedAt ? (
                    <p className="faint mt-2 text-[11px]">Last failure {formatDateTime(point.lastFailedAt)}</p>
                  ) : null}
                  {point.fails < 2 ? (
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Wrench size={12} />}
                        onClick={() => setConfirmKp(point.id)}
                      >
                        Log failure
                      </Button>
                    </div>
                  ) : null}
                  {confirmKp === point.id ? (
                    <div className="mt-2 rounded-lg border border-warn/30 bg-warn-soft p-2.5">
                      <p className="text-[11.5px] leading-relaxed text-t2">
                        This records failure #{point.fails + 1} on “{point.primitive || point.concept}”.
                        {point.fails + 1 >= 2
                          ? ' The node will need a repair drill and every direct prerequisite will be flagged.'
                          : ' One more failure will trigger remediation.'}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="danger" onClick={() => handleFailure(point)}>
                          Confirm failure
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmKp(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHead
              title="Prerequisites"
              eyebrow={`${masteredPrereqs}/${prerequisites.length} proven`}
            />
            {prerequisites.length === 0 ? (
              <p className="faint text-[11.5px]">No prerequisites. This node is a root in the graph.</p>
            ) : (
              <div className="space-y-1.5">
                {prerequisites.map((prereq) => (
                  <button
                    key={prereq.id}
                    type="button"
                    onClick={() => navigate(`#/node/${prereq.id}`)}
                    className="flex w-full items-center gap-2 rounded-lg border border-line bg-s1 px-2.5 py-2 text-left transition hover:border-line-strong"
                  >
                    <NodeBadgePill status={nodeBadge(prereq, subject, overrides)} />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">{prereq.title}</span>
                    <ArrowRight size={12} className="flex-none text-t3" aria-hidden />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHead title="Implicit repetition" eyebrow="FIRe links" />
            {encompassed.length === 0 ? (
              <p className="faint text-[11.5px]">
                Reviewing this node does not credit older nodes yet. Add encompassed nodes when the relationship
                is real.
              </p>
            ) : (
              <div className="space-y-1.5">
                {encompassed.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => navigate(`#/node/${entry.id}`)}
                    className="flex w-full items-start gap-2 rounded-lg border border-line bg-s1 px-2.5 py-2 text-left transition hover:border-line-strong"
                  >
                    <Sparkles size={13} className="mt-0.5 flex-none text-accent" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-medium">{entry.title}</span>
                      <span className="faint text-[11px]">
                        strength {entry.srs.strength.toFixed(1)} · {entry.srs.implicitReviews} implicit reviews
                      </span>
                    </span>
                    <ArrowRight size={12} className="mt-0.5 flex-none text-t3" aria-hidden />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHead title="Working notes" eyebrow="Fix the mental model, not the symptom" />
            <textarea
              className="textarea min-h-[90px]"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What did you get wrong? The exact invariant, the failing case, the corrected model."
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={notes === (node.notes ?? '')}
                onClick={() => {
                  updateNode(node.id, { notes: notes.trim() || undefined })
                  toast('Node notes saved.', 'success')
                }}
              >
                Save notes
              </Button>
            </div>
          </section>

          <div className="flex items-center justify-between border-t border-line pt-3">
            <p className="faint text-[11px]">
              {week ? `Week ${week.weekNumber} · ` : ''}
              created {node.createdAt ? formatDateTime(node.createdAt) : 'earlier'}
            </p>
            <button
              type="button"
              className="text-t3 hover:text-t1"
              onClick={() => setEditing(true)}
              aria-label="Edit node"
            >
              <Pencil size={14} />
            </button>
          </div>

          {!open && !weekOpen ? (
            <p className="flex items-center gap-1.5 text-[11px] text-t3">
              <AlertTriangle size={12} /> Actions unlock when the week gate clears.
            </p>
          ) : null}
        </div>
      )}
    </Sheet>
  )
}

function KpRow({ letter, label, text }: { letter: string; label: string; text: string }) {
  return (
    <div className="kp-pill">
      <span className="kp-index">{letter}</span>
      <div className="min-w-0">
        <p className="faint text-[11px] tracking-[0.1em]">{label}</p>
        <p className={cn('text-[12px] leading-snug', !text && 'italic text-t3')}>{text || 'Not written yet.'}</p>
      </div>
    </div>
  )
}
