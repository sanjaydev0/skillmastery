import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Filter,
  Lock,
  Plus,
  Search,
  Target,
  Wrench,
} from 'lucide-react'
import type { KnowledgeNode } from '../../types/schema'
import { useActiveSubject, useActiveWeek, useAppStore } from '../../store/AppStore'
import type { NodeBadge } from '../../engine/gating'
import { nodeBadge, overallMastery } from '../../engine/gating'
import { activeFlags } from '../../engine/remediation'
import { weaknessCount } from './nodeHelpers'
import { cn, percent } from '../../lib/utils'
import { navigate } from '../../lib/router'
import { Sheet } from '../../components/ui/Sheet'
import {
  Badge,
  Button,
  EmptyState,
  NodeBadgePill,
  ProgressBar,
} from '../../components/ui/primitives'
import { NodeEditorForm } from './NodeEditorForm'

type BadgeFilter = 'all' | NodeBadge
const FILTERS: { id: BadgeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ready', label: 'Ready' },
  { id: 'learning', label: 'Learning' },
  { id: 'mastered', label: 'Mastered' },
  { id: 'needs-repair', label: 'Repair' },
  { id: 'locked', label: 'Locked' },
]

export function NodesView() {
  const subject = useActiveSubject()
  const week = useActiveWeek()
  const overrides = useAppStore((state) => state.overrides)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<BadgeFilter>('all')
  const [weekFilter, setWeekFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)

  const weekNumbers = useMemo(
    () => new Map(subject.weeks.map((entry) => [entry.id, entry.weekNumber])),
    [subject.weeks],
  )

  const rows = useMemo(
    () =>
      subject.nodes
        .map((node) => ({ node, badge: nodeBadge(node, subject, overrides) }))
        .sort(
          (a, b) =>
            (weekNumbers.get(a.node.weekId) ?? 0) - (weekNumbers.get(b.node.weekId) ?? 0) ||
            a.node.title.localeCompare(b.node.title),
        ),
    [subject, overrides, weekNumbers],
  )

  const counts = useMemo(() => {
    const base: Record<BadgeFilter, number> = {
      all: rows.length,
      ready: 0,
      learning: 0,
      mastered: 0,
      'needs-repair': 0,
      locked: 0,
    }
    for (const row of rows) base[row.badge]++
    return base
  }, [rows])

  const filtered = rows.filter(({ node, badge }) => {
    if (filter !== 'all' && badge !== filter) return false
    if (weekFilter !== 'all' && node.weekId !== weekFilter) return false
    if (!query.trim()) return true
    const hay = `${node.title} ${node.tags.join(' ')} ${node.knowledgePoints
      .map((point) => `${point.primitive} ${point.concept} ${point.failureMode}`)
      .join(' ')} ${node.notes ?? ''}`.toLowerCase()
    return hay.includes(query.trim().toLowerCase())
  })

  const repairCount = subject.nodes.filter(
    (node) => node.status === 'needs-repair' || activeFlags(node).length > 0,
  ).length

  return (
    <div>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Primitive → Concept → Failure mode</p>
          <h1 className="h1 mt-1">Knowledge graph</h1>
          <p className="muted mt-1 max-w-2xl text-[13px]">
            Nodes open only when their week is available and every prerequisite is proven. Mastery is
            earned through a blind gate, never by checking a box.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
          New node
        </Button>
      </header>

      <section className="ledger mt-4" aria-label="Graph totals">
        <MiniStat
          label="Total nodes"
          value={rows.length}
          meta={`${subject.nodes.reduce((sum, node) => sum + node.knowledgePoints.length, 0)} knowledge points`}
        />
        <MiniStat
          label="Mastered"
          value={counts.mastered}
          meta={`${percent(overallMastery(subject.nodes))}% graph mastery`}
          tone="good"
        />
        <MiniStat
          label="Repair queue"
          value={repairCount}
          meta="Prerequisite flags and failed nodes"
          tone={repairCount ? 'bad' : 'neutral'}
        />
        <MiniStat
          label="FIRe credits"
          value={subject.nodes.reduce((sum, node) => sum + node.srs.implicitReviews, 0)}
          meta="Implicit reviews across the graph"
          tone="accent"
        />
      </section>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-t3" />
          <input
            className="input !pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search nodes, tags, failure modes…"
            aria-label="Search knowledge nodes"
          />
        </label>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[11px] text-t3 sm:flex">
            <Filter size={12} aria-hidden /> Week
          </span>
          <select
            className="select !h-[38px] w-auto min-w-[150px] !py-0"
            value={weekFilter}
            onChange={(event) => setWeekFilter(event.target.value)}
            aria-label="Filter by week"
          >
            <option value="all">All weeks</option>
            {[...subject.weeks]
              .sort((a, b) => a.weekNumber - b.weekNumber)
              .map((entry) => (
                <option key={entry.id} value={entry.id}>
                  Week {entry.weekNumber} · {entry.title}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {FILTERS.map((entry) => {
          const selected = filter === entry.id
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setFilter(entry.id)}
              aria-pressed={selected}
              className={cn(
                'inline-flex h-11 items-center gap-1.5 rounded-full border px-3 text-[11px] font-medium transition sm:h-7 sm:px-2.5',
                selected
                  ? 'border-accent/30 bg-accent-soft text-accent-strong'
                  : 'border-line bg-s1 text-t2 hover:border-line-strong',
              )}
            >
              {entry.label}
              <span className={cn('num text-[11px]', selected ? 'text-accent-strong' : 'text-t3')}>
                {counts[entry.id]}
              </span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card mt-4">
          <EmptyState
            icon={<Target size={18} />}
            title={subject.nodes.length === 0 ? 'Build the first node' : 'No nodes match this filter'}
            description={
              subject.nodes.length === 0
                ? 'Every node needs a primitive, a concept and a failure mode. Start with the Week 1 anchor.'
                : 'Clear the search or choose a different state. The graph still has work hiding elsewhere.'
            }
            action={
              subject.nodes.length === 0 ? (
                <Button variant="primary" icon={<Plus size={14} />} onClick={() => setCreateOpen(true)}>
                  Create the first node
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery('')
                    setFilter('all')
                    setWeekFilter('all')
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3 xl:gap-2.5">
          {filtered.map(({ node, badge }) => (
            <NodeCard key={node.id} node={node} badge={badge} weekNumber={weekNumbers.get(node.weekId)} />
          ))}
        </div>
      )}

      <p className="faint mt-4 text-center text-[11px]">
        {filtered.length} of {rows.length} nodes shown · {repairCount} need{repairCount === 1 ? 's' : ''} a repair drill
      </p>

      {createOpen ? (
        <Sheet
          title="New knowledge node"
          eyebrow={`${subject.shortName} · primitive → concept → failure mode`}
          onClose={() => setCreateOpen(false)}
        >
          {subject.weeks.length === 0 ? (
            <EmptyState
              icon={<Lock size={17} />}
              title="Add a week first"
              description="Nodes belong to weeks. Create a week in the curriculum, then attach nodes to it."
              action={<Button variant="primary" onClick={() => { setCreateOpen(false); navigate('#/plan') }}>Open curriculum</Button>}
            />
          ) : (
            <NodeEditorForm
              subject={subject}
              weekId={week?.id ?? subject.weeks[0]?.id}
              onDone={() => setCreateOpen(false)}
              onCancel={() => setCreateOpen(false)}
            />
          )}
        </Sheet>
      ) : null}
    </div>
  )
}

function MiniStat({
  label,
  value,
  meta,
  tone = 'neutral',
}: {
  label: string
  value: number
  meta: string
  tone?: 'neutral' | 'good' | 'bad' | 'accent'
}) {
  const colour =
    tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : tone === 'accent' ? 'text-accent' : 'text-t1'
  return (
    <div>
      <p className="eyebrow truncate">{label}</p>
      <p className={cn('num mt-1 text-[19px] leading-none font-semibold', colour)}>{value}</p>
      <p className="faint mt-1 text-[11px]">{meta}</p>
    </div>
  )
}

function NodeCard({
  node,
  badge,
  weekNumber,
}: {
  node: KnowledgeNode
  badge: NodeBadge
  weekNumber?: number
}) {
  const kp = node.knowledgePoints[0]
  const flags = activeFlags(node)
  const totalFails = weaknessCount(node)
  return (
    <button
      type="button"
      onClick={() => navigate(`#/node/${node.id}`)}
      className="card card-hover group flex min-h-[150px] flex-col p-3.5 text-left"
      aria-label={`Open node ${node.title}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <NodeBadgePill status={badge} />
          {flags.length > 0 ? (
            <Badge tone="bad" icon={<Wrench size={10} />}>
              {flags.length} repair
            </Badge>
          ) : null}
        </div>
        <span className="num faint flex-none rounded-md bg-s2 px-1.5 py-0.5 text-[11px]">
          W{weekNumber ?? '?'}
        </span>
      </div>

      <h3 className="mt-1.5 line-clamp-2 text-[13px] leading-snug font-semibold">{node.title}</h3>
      {kp ? <p className="muted mt-1 line-clamp-2 text-[11px] leading-relaxed">{kp.primitive}</p> : null}

      <div className="mt-2 flex flex-wrap gap-1">
        {node.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="pill !px-1.5 !py-0 !text-[11px]">
            {tag}
          </span>
        ))}
        {node.tags.length > 3 ? (
          <span className="faint text-[11px]">+{node.tags.length - 3}</span>
        ) : null}
      </div>

      <div className="mt-auto pt-2.5">
        <div className="flex items-center gap-2">
          <ProgressBar
            value={node.srs.strength / 5}
            tone={node.status === 'mastered' ? 'good' : totalFails >= 2 ? 'bad' : 'accent'}
            className="!h-1.5 flex-1"
            label={`${node.title} strength`}
          />
          <span className="faint num text-[11px]">{node.srs.strength.toFixed(1)}/5</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="faint truncate text-[11px]">
            {node.knowledgePoints.length} KP · {node.srs.implicitReviews} FIRe · {totalFails} fails
          </span>
          <ArrowRight size={12} className="flex-none text-t3 transition group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
        </div>
      </div>
    </button>
  )
}
