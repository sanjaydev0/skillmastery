import { useMemo, useState } from 'react'
import {
  BookOpen,
  Check,
  ExternalLink,
  FileText,
  GraduationCap,
  Library,
  Minus,
  Newspaper,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import type { Book, Resource, ResourceKind } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { cn, percent } from '../../lib/utils'
import {
  Badge,
  Button,
  EmptyState,
  ProgressBar,
  ResourceBadge,
  SectionHead,
  Tabs,
} from '../../components/ui/primitives'
import { ResourceFormSheet } from './ResourceFormSheet'
import { BookFormSheet } from './BookFormSheet'

type KindFilter = 'all' | ResourceKind

const KIND_ICON: Record<ResourceKind, typeof FileText> = {
  docs: FileText,
  curriculum: GraduationCap,
  article: Newspaper,
}

const KIND_LABEL: Record<ResourceKind, string> = {
  docs: 'Docs',
  curriculum: 'Curriculum',
  article: 'Article',
}

export function VaultView() {
  const subject = useActiveSubject()
  const books = useAppStore((state) => state.books)
  const cycleResource = useAppStore((state) => state.cycleResource)
  const updateBook = useAppStore((state) => state.updateBook)
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [query, setQuery] = useState('')
  const [resourceForm, setResourceForm] = useState<Resource | 'new' | null>(null)
  const [bookForm, setBookForm] = useState<Book | 'new' | null>(null)

  const weekNumbers = useMemo(
    () => new Map(subject.weeks.map((week) => [week.id, week.weekNumber])),
    [subject.weeks],
  )

  const resources = subject.resources
  const docs = resources.filter((resource) => resource.kind === 'docs')
  const docsDone = docs.filter((resource) => resource.status === 'done').length
  const curricula = resources.filter((resource) => resource.kind === 'curriculum').length
  const totalChapters = books.reduce((sum, book) => sum + book.totalChapters, 0)
  const readChapters = books.reduce((sum, book) => sum + Math.min(book.totalChapters, book.currentChapter), 0)
  const canonProgress = totalChapters ? readChapters / totalChapters : 0

  const counts: Record<KindFilter, number> = {
    all: resources.length,
    docs: resources.filter((resource) => resource.kind === 'docs').length,
    curriculum: resources.filter((resource) => resource.kind === 'curriculum').length,
    article: resources.filter((resource) => resource.kind === 'article').length,
  }

  const filtered = resources.filter((resource) => {
    if (kindFilter !== 'all' && resource.kind !== kindFilter) return false
    if (!query.trim()) return true
    return `${resource.title} ${resource.url} ${resource.tags.join(' ')} ${resource.description ?? ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  })

  return (
    <div>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Reference, not rabbit holes</p>
          <h1 className="h1 mt-1">Library</h1>
          <p className="muted mt-1 max-w-2xl text-[13px]">
            The docs, the 30-minute canon and the community curricula. Saved locally; external links only open
            when you choose.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" icon={<BookOpen size={14} />} onClick={() => setBookForm('new')}>
            Add book
          </Button>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setResourceForm('new')}>
            Add resource
          </Button>
        </div>
      </header>

      <section className="ledger mt-4" aria-label="Library totals">
        <VaultStat
          label="Docs read"
          value={`${docsDone} of ${docs.length}`}
          meta="Official documentation"
          tone="accent"
        />
        <VaultStat label="Curricula" value={String(curricula)} meta="Community tracks" tone="info" />
        <VaultStat
          label="Canon progress"
          value={`${percent(canonProgress)}%`}
          meta={`${readChapters} of ${totalChapters} chapters`}
          tone="good"
        />
        <VaultStat label="Resources" value={String(resources.length)} meta="Saved on this device" />
      </section>

      <section className="mt-5">
        <SectionHead
          title="Resource library"
          eyebrow={`${resources.length} saved · ${resources.filter((resource) => resource.status === 'done').length} finished`}
          action={
            <Button size="sm" variant="soft" icon={<Plus size={13} />} onClick={() => setResourceForm('new')}>
              Add
            </Button>
          }
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            items={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'docs', label: 'Docs', count: counts.docs },
              { id: 'curriculum', label: 'Curricula', count: counts.curriculum },
              { id: 'article', label: 'Articles', count: counts.article },
            ]}
            value={kindFilter}
            onChange={(value) => setKindFilter(value as KindFilter)}
          />
          <label className="relative sm:w-64">
            <Search size={13} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-t3" />
            <input
              className="input h-11 !py-0 !pl-8 !text-[11.5px] sm:!h-8"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter the vault…"
              aria-label="Search resources"
            />
          </label>
        </div>

        {resources.length === 0 ? (
          <div className="card mt-2">
            <EmptyState
              icon={<Library size={17} />}
              title="The vault is empty"
              description="Add the official docs for the week, a community curriculum, or a reference article."
              action={<Button variant="primary" icon={<Plus size={14} />} onClick={() => setResourceForm('new')}>Add first resource</Button>}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card mt-2">
            <EmptyState compact title="No resources match" description="Clear the filter or search a different term." />
          </div>
        ) : (
          <div className="card mt-2 divide-y divide-line overflow-hidden">
            {filtered.map((resource) => {
              const Icon = KIND_ICON[resource.kind]
              const weekNumber = resource.weekId ? weekNumbers.get(resource.weekId) : undefined
              return (
                <div key={resource.id} className="flex items-start gap-2.5 px-3 py-2.5 transition hover:bg-s2">
                  <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center text-t3" aria-hidden>
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 truncate text-[12.5px] font-semibold hover:text-accent-strong hover:underline"
                      >
                        {resource.title}
                      </a>
                      <span className="faint text-[11px]">{KIND_LABEL[resource.kind]}</span>
                      {weekNumber ? <span className="pill !py-0 !text-[11px]">W{weekNumber}</span> : null}
                    </div>
                    {resource.description ? (
                      <p className="muted mt-0.5 line-clamp-1 text-[11px]">{resource.description}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {resource.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="pill !px-1.5 !py-0 !text-[11px]">
                          {tag}
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => cycleResource(resource.id)}
                        className="ml-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition hover:bg-s2"
                        aria-label={`Status: ${resource.status}. Advance reading status.`}
                        title="Advance reading status"
                      >
                        <ResourceBadge status={resource.status} />
                        <RefreshCw size={9} className="text-t3" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-0.5">
                    <button
                      type="button"
                      className="icon-btn !h-11 !w-11 sm:!h-8 sm:!w-8"
                      onClick={() => setResourceForm(resource)}
                      aria-label={`Edit ${resource.title}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="icon-btn !h-11 !w-11 sm:!h-8 sm:!w-8"
                      aria-label={`Open ${resource.title} in a new tab`}
                      title="Open resource"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-6">
        <SectionHead
          title="The 30-minute canon"
          eyebrow={`${books.length} books · shared across tracks`}
          action={
            <Button size="sm" variant="soft" icon={<Plus size={13} />} onClick={() => setBookForm('new')}>
              Add book
            </Button>
          }
        />
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-line bg-s2 px-3 py-2">
          <BookOpen size={13} className="flex-none text-t2" aria-hidden />
          <p className="faint text-[11.5px]">
            Passive input belongs to the person, not the track. A 30-minute daily block, one chapter at a time.
          </p>
          <span className="num ml-auto text-[11px] font-semibold">{percent(canonProgress)}%</span>
        </div>
        {books.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<BookOpen size={17} />}
              title="No canon books yet"
              description="Add a timeless book and assign it to a week range. It will surface on the overview while it is active."
              action={<Button variant="primary" onClick={() => setBookForm('new')}>Add a book</Button>}
            />
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {books.map((book, index) => {
              const done = book.totalChapters > 0 && book.currentChapter >= book.totalChapters
              const displayedStatus = done ? 'done' : book.status
              const step = (delta: number) => {
                if (book.totalChapters === 0) return
                const next = Math.max(0, Math.min(book.totalChapters, book.currentChapter + delta))
                const status = next >= book.totalChapters ? 'done' : next > 0 ? 'reading' : 'toRead'
                updateBook(book.id, { currentChapter: next, status })
              }
              return (
                <div key={book.id} className="card flex gap-3 p-3">
                  <div
                    className="relative flex h-[92px] w-[66px] flex-none flex-col justify-between overflow-hidden rounded-lg border border-line p-2"
                    style={{
                      background: `linear-gradient(145deg, color-mix(in srgb, var(--accent) ${12 + (index % 3) * 4}%, var(--surface-2)), var(--surface-1))`,
                    }}
                    aria-hidden
                  >
                    <span className="text-[11px] font-semibold text-t3">Canon</span>
                    <span className="text-[17px] font-bold leading-none text-accent-strong">
                      {book.title
                        .split(/\s+/)
                        .filter((word) => !['the', 'a', 'an', 'of', 'to', 'and'].includes(word.toLowerCase()))
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join('')}
                    </span>
                    <span className="truncate text-[11px] text-t3">{book.author}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[12px] leading-snug font-semibold">{book.title}</p>
                        <p className="faint truncate text-[11px]">{book.pillar}</p>
                      </div>
                      <button
                        type="button"
                        className="icon-btn !h-6 !w-6"
                        onClick={() => setBookForm(book)}
                        aria-label={`Edit ${book.title}`}
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <ResourceBadge status={displayedStatus} />
                      <span className="faint text-[11px]">W{book.weekFrom}–{book.weekTo}</span>
                      {book.url ? (
                        <a
                          href={book.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-t3 hover:text-t1"
                          aria-label={`Open ${book.title}`}
                        >
                          <ExternalLink size={11} />
                        </a>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <ProgressBar
                        value={book.totalChapters ? book.currentChapter / book.totalChapters : 0}
                        tone={done ? 'good' : 'accent'}
                        className="!h-1.5 flex-1"
                        label={`${book.title} reading progress`}
                      />
                      <span className="faint num text-[11px]">
                        {book.currentChapter}/{book.totalChapters}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="grid h-6 w-6 place-items-center rounded-md border border-line bg-s2 text-t2 hover:border-line-strong disabled:opacity-40"
                          onClick={() => step(-1)}
                          disabled={book.currentChapter <= 0}
                          aria-label={`One fewer chapter of ${book.title}`}
                        >
                          <Minus size={10} />
                        </button>
                        <button
                          type="button"
                          className="grid h-6 w-6 place-items-center rounded-md border border-line bg-s2 text-t2 hover:border-line-strong disabled:opacity-40"
                          onClick={() => step(1)}
                          disabled={book.totalChapters === 0 || book.currentChapter >= book.totalChapters}
                          aria-label={`One more chapter of ${book.title}`}
                        >
                          <Check size={10} />
                        </button>
                        <span className="faint ml-1 text-[11px]">chapter</span>
                      </div>
                      <span className="faint text-[11px]">{book.status === 'done' ? 'Finished' : '30 min/day'}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="mt-6 rounded-xl border border-line bg-s2 p-3">
        <div className="flex items-start gap-2">
          <Badge tone="neutral">Offline first</Badge>
          <p className="faint text-[11.5px] leading-relaxed">
            Resource metadata, reading status and canon progress are stored in your local backup. External URLs
            are never fetched until you open them.
          </p>
        </div>
      </div>

      {resourceForm ? (
        <ResourceFormSheet
          resource={resourceForm === 'new' ? undefined : resourceForm}
          onClose={() => setResourceForm(null)}
        />
      ) : null}
      {bookForm ? (
        <BookFormSheet
          book={bookForm === 'new' ? undefined : bookForm}
          onClose={() => setBookForm(null)}
        />
      ) : null}
    </div>
  )
}

function VaultStat({
  label,
  value,
  meta,
  tone = 'neutral',
}: {
  label: string
  value: string
  meta: string
  tone?: 'neutral' | 'accent' | 'info' | 'good'
}) {
  const colour =
    tone === 'accent' ? 'text-accent' : tone === 'info' ? 'text-info' : tone === 'good' ? 'text-good' : 'text-t1'
  return (
    <div>
      <p className="eyebrow truncate">{label}</p>
      <p className={cn('num mt-1 text-[19px] leading-none font-semibold', colour)}>{value}</p>
      <p className="faint mt-1 text-[11px]">{meta}</p>
    </div>
  )
}
