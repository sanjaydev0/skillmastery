import { useMemo, useState } from 'react'
import {
  Download,
  FileJson,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import type { Flashcard } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { formatDateTime as formatTimestamp, relativeDays } from '../../lib/dates'
import { downloadText, fileStamp, slugify, toAnkiCsv, toAnkiTsv } from '../../lib/utils'
import { Badge, Button, EmptyState } from '../../components/ui/primitives'
import { CardFormSheet } from './CardFormSheet'
import { ImportCardsSheet } from './ImportCardsSheet'

export function DeckPanel() {
  const subject = useActiveSubject()
  const deleteCard = useAppStore((state) => state.deleteCard)
  const toast = useUiStore((state) => state.toast)
  const [query, setQuery] = useState('')
  const [weekFilter, setWeekFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'core' | 'mistake'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Flashcard | undefined>()
  const [importOpen, setImportOpen] = useState(false)

  const weekNumbers = useMemo(
    () => new Map(subject.weeks.map((week) => [week.id, week.weekNumber])),
    [subject.weeks],
  )

  const filtered = useMemo(() => {
    const normal = query.trim().toLowerCase()
    return subject.cards.filter((card) => {
      if (weekFilter !== 'all' && card.weekId !== weekFilter) return false
      if (sourceFilter !== 'all' && card.source !== sourceFilter) return false
      if (!normal) return true
      return `${card.front} ${card.back} ${card.tags.join(' ')}`.toLowerCase().includes(normal)
    })
  }, [subject.cards, query, weekFilter, sourceFilter])

  const exportCards = (format: 'tsv' | 'csv') => {
    if (filtered.length === 0) return
    const options = {
      deck: `MasteryHarness::${subject.shortName}`,
      nodes: subject.nodes,
      weeks: subject.weeks,
    }
    const content = format === 'tsv' ? toAnkiTsv(filtered, options) : toAnkiCsv(filtered, options)
    downloadText(
      `masteryharness-${slugify(subject.shortName) || 'deck'}-${fileStamp()}.${format}`,
      content,
      format === 'tsv' ? 'text/tab-separated-values' : 'text/csv',
    )
    toast(`Exported ${filtered.length} card${filtered.length === 1 ? '' : 's'} as ${format.toUpperCase()}.`, 'success')
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Anki-compatible deck</p>
          <p className="muted mt-1 text-[12px]">
            {subject.cards.length} cards · {filtered.length} shown · schedule days 1/3/6/10/weekly
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" icon={<Download size={13} />} onClick={() => exportCards('tsv')} disabled={filtered.length === 0}>
            TSV
          </Button>
          <Button size="sm" variant="outline" icon={<Download size={13} />} onClick={() => exportCards('csv')} disabled={filtered.length === 0}>
            CSV
          </Button>
          <Button size="sm" variant="soft" icon={<FileJson size={13} />} onClick={() => setImportOpen(true)}>
            Import JSON
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<Plus size={13} />}
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            New card
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-t3" />
          <input
            className="input !pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search fronts, backs and tags…"
            aria-label="Search cards"
          />
        </label>
        <div className="flex gap-2">
          <select
            className="select !h-[38px] w-auto min-w-[132px] !py-0"
            value={weekFilter}
            onChange={(event) => setWeekFilter(event.target.value)}
            aria-label="Filter cards by week"
          >
            <option value="all">All weeks</option>
            {[...subject.weeks]
              .sort((a, b) => a.weekNumber - b.weekNumber)
              .map((week) => (
                <option key={week.id} value={week.id}>
                  Week {week.weekNumber}
                </option>
              ))}
          </select>
          <select
            className="select !h-[38px] w-auto min-w-[122px] !py-0"
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as 'all' | 'core' | 'mistake')}
            aria-label="Filter cards by source"
          >
            <option value="all">All sources</option>
            <option value="core">Core</option>
            <option value="mistake">Mistakes</option>
          </select>
        </div>
      </div>

      {subject.cards.length === 0 ? (
        <div className="card mt-3">
          <EmptyState
            icon={<FileJson size={18} />}
            title="The deck is empty"
            description="Add atomic cards manually, or generate them from a week with the Anki prompt, then import the JSON."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" icon={<Plus size={14} />} onClick={() => setFormOpen(true)}>
                  Add first card
                </Button>
                <Button variant="outline" icon={<FileJson size={14} />} onClick={() => setImportOpen(true)}>
                  Import AI JSON
                </Button>
              </div>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card mt-3">
          <EmptyState
            compact
            title="No cards match"
            description="Clear the search or filters. The rest of the deck is still here."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery('')
                  setWeekFilter('all')
                  setSourceFilter('all')
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {filtered.map((card) => {
            const weekNumber = card.weekId ? weekNumbers.get(card.weekId) : undefined
            const node = card.nodeId ? subject.nodes.find((entry) => entry.id === card.nodeId) : undefined
            return (
              <div key={card.id} className="card p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={card.source === 'mistake' ? 'bad' : 'neutral'}>
                        {card.source === 'mistake' ? 'Mistake' : 'Core'}
                      </Badge>
                      {weekNumber ? <span className="pill !py-0 !text-[9.5px]">W{weekNumber}</span> : null}
                      {node ? <span className="faint truncate text-[10px]">· {node.title}</span> : null}
                      <span className="faint text-[10px]">· due {relativeDays(card.dueAt)}</span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] font-semibold">{card.front}</p>
                    <p className="muted mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed">{card.back}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {card.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="pill !px-1.5 !py-0 !text-[9.5px]">
                          {tag}
                        </span>
                      ))}
                      <span className="faint ml-auto num text-[9.5px]">
                        {card.reviews} reviews · {card.lapses} lapses · edited {formatTimestamp(card.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-0.5">
                    <button
                      type="button"
                      className="icon-btn !h-11 !w-11 sm:!h-8 sm:!w-8"
                      aria-label={`Edit card: ${card.front}`}
                      onClick={() => {
                        setEditing(card)
                        setFormOpen(true)
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn !h-11 !w-11 hover:!text-bad sm:!h-8 sm:!w-8"
                      aria-label={`Delete card: ${card.front}`}
                      onClick={() => {
                        if (window.confirm('Delete this card? Review history will be lost.')) {
                          deleteCard(card.id)
                          toast('Card deleted.', 'info')
                        }
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="faint mt-3 text-center text-[10.5px]">
        Export uses the current filter. Imported cards are new until their first review.
      </p>

      {formOpen ? (
        <CardFormSheet
          card={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(undefined)
          }}
        />
      ) : null}
      {importOpen ? <ImportCardsSheet onClose={() => setImportOpen(false)} /> : null}
    </div>
  )
}
