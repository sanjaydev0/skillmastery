import { useMemo, useState } from 'react'
import { BookMarked, Search } from 'lucide-react'
import type { Concept } from '../../types/schema'
import { useActiveSubject } from '../../store/AppStore'
import { conceptBadge, conceptsForWeek, dueConcepts, overallProof } from '../../engine/concepts'
import { cn, percent } from '../../lib/utils'
import { formatShortDate } from '../../lib/dates'
import { ConceptBadgePill, EmptyState } from '../../components/ui/primitives'
import { ConceptSheet } from './ConceptSheet'

type ConceptFilter = 'all' | 'due' | 'shaky' | 'solid' | 'new'

const FILTERS: { id: ConceptFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'due', label: 'Due' },
  { id: 'shaky', label: 'Shaky' },
  { id: 'solid', label: 'Solid' },
  { id: 'new', label: 'Not proved' },
]

function matchesFilter(concept: Concept, filter: ConceptFilter): boolean {
  const badge = conceptBadge(concept)
  if (filter === 'all') return true
  if (filter === 'due') return badge === 'due'
  if (filter === 'shaky') return badge === 'learning'
  if (filter === 'solid') return badge === 'proved'
  return badge === 'new'
}

export function ConceptsView() {
  const subject = useActiveSubject()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ConceptFilter>('all')
  const [openId, setOpenId] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      [...subject.concepts].sort(
        (a, b) => a.weekNumber - b.weekNumber || a.term.localeCompare(b.term),
      ),
    [subject.concepts],
  )

  const filtered = rows.filter((concept) => {
    if (!matchesFilter(concept, filter)) return false
    if (!query.trim()) return true
    const hay = `${concept.term} ${concept.definition} ${concept.failureMode} ${concept.notes ?? ''}`
    return hay.toLowerCase().includes(query.trim().toLowerCase())
  })

  const due = dueConcepts(subject.concepts)
  const proved = subject.concepts.filter((concept) => conceptBadge(concept) === 'proved' || conceptBadge(concept) === 'due').length

  // One section per week up to the last week that owns concepts. A week with
  // none keeps its place and says so, instead of quietly vanishing from the
  // record; weeks after the route's last concept stay hidden.
  const maxConceptWeek = rows.length > 0 ? rows[rows.length - 1]!.weekNumber : 0
  const sections = useMemo(
    () =>
      [...subject.weeks]
        .sort((a, b) => a.weekNumber - b.weekNumber)
        .filter((week) => week.weekNumber <= maxConceptWeek)
        .map((week) => ({
          week,
          all: conceptsForWeek(rows, week.weekNumber),
          shown: conceptsForWeek(filtered, week.weekNumber),
        })),
    [subject.weeks, filtered, maxConceptWeek],
  )

  return (
    <div>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">What you learned, and when you proved it</p>
          <h1 className="h1 mt-1">Concepts</h1>
          <p className="muted mt-1 max-w-2xl text-[13px]">
            The route defines the concepts. Your proofs define their state. A concept is solid only after
            you recalled it without notes.
          </p>
        </div>
      </header>

      <section className="ledger mt-4" aria-label="Concept totals">
        <Total label="Concepts" value={subject.concepts.length} meta={`${sections.length} weeks covered`} />
        <Total label="Proved" value={proved} meta={`${percent(overallProof(subject.concepts))}% of the course`} />
        <Total
          label="Due today"
          value={due.length}
          meta={due.length > 0 ? 'Open Practice to review' : 'Nothing due'}
        />
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-s1 px-3 py-2">
          <Search size={14} className="flex-none text-t3" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search terms and definitions"
            aria-label="Search concepts"
            className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-t3"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Concept filters">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={filter === entry.id}
            onClick={() => setFilter(entry.id)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11.5px] transition',
              filter === entry.id ? 'border-accent/50 bg-accent-soft font-medium' : 'border-line bg-s1',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<BookMarked size={18} aria-hidden />}
            title="No concepts recorded yet"
            description="Concepts come from the route. Generate a week and it adds its own."
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<BookMarked size={18} aria-hidden />}
            title="No concepts match"
            description="Clear the search or pick another filter."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {sections.map(({ week, all, shown }) => (
            <section key={week.id} className="card p-3.5" aria-label={`Week ${week.weekNumber} concepts`}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[12.5px] font-semibold">
                  Week {week.weekNumber}
                  <span className="faint ml-1.5 font-normal">{week.title}</span>
                </p>
                {shown.length > 0 ? (
                  <span className="faint num flex-none text-[11px]">{shown.length} shown</span>
                ) : null}
              </div>
              {shown.length === 0 ? (
                <p className="faint mt-2 text-[11.5px]">
                  {all.length === 0
                    ? 'No concepts recorded for this week yet.'
                    : 'Nothing here matches the filter.'}
                </p>
              ) : (
                <div className="mt-2.5 space-y-1.5">
                  {shown.map((concept) => (
                    <ConceptRow key={concept.id} concept={concept} onOpen={() => setOpenId(concept.id)} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {openId ? <ConceptSheet conceptId={openId} onClose={() => setOpenId(null)} /> : null}
    </div>
  )
}

function ConceptRow({ concept, onOpen }: { concept: Concept; onOpen: () => void }) {
  const badge = conceptBadge(concept)
  const last = concept.checks[concept.checks.length - 1]
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-s1 px-2.5 py-2 text-left transition hover:border-line-strong"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium">{concept.term}</span>
        <span className="faint mt-0.5 block truncate text-[11px]">
          {last ? `proved ${formatShortDate(last.at)}` : 'not proved yet'}
        </span>
      </span>
      <ConceptBadgePill status={badge} />
    </button>
  )
}

function Total({ label, value, meta }: { label: string; value: number; meta: string }) {
  return (
    <div>
      <p className="faint text-[11px]">{label}</p>
      <p className="num mt-0.5 text-[16px] font-semibold">{value}</p>
      <p className="faint mt-0.5 text-[11px]">{meta}</p>
    </div>
  )
}
