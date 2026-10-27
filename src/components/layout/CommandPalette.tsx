import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarRange,
  Command,
  Download,
  LayoutDashboard,
  Library,
  Moon,
  Network,
  Plus,
  Search,
  Settings,
  Sun,
  X,
} from 'lucide-react'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { buildSearchIndex, searchIndex } from '../../engine/search'
import type { SearchDoc, SearchKind } from '../../engine/search'
import { navigate, VIEWS } from '../../lib/router'
import { exportBackupJson } from '../../services/exports'
import { cn } from '../../lib/utils'
import { Kbd } from '../ui/primitives'

interface PaletteEntry {
  id: string
  group: string
  label: string
  subtitle?: string
  icon: ReactNode
  keywords?: string
  run: () => void
}

const KIND_ICON: Record<SearchKind, typeof BookOpen> = {
  week: CalendarRange,
  node: Network,
  card: BrainCircuit,
  resource: Library,
  book: BookOpen,
}

const KIND_LABEL: Record<SearchKind, string> = {
  week: 'Week',
  node: 'Node',
  card: 'Card',
  resource: 'Resource',
  book: 'Book',
}

const VIEW_ICONS: Record<string, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  curriculum: CalendarRange,
  nodes: Network,
  recall: BrainCircuit,
  vault: Library,
}

export function CommandPalette() {
  const subjects = useAppStore((state) => state.subjects)
  const books = useAppStore((state) => state.books)
  const activeSubjectId = useAppStore((state) => state.activeSubjectId)
  const prefs = useAppStore((state) => state.prefs)
  const setActiveSubject = useAppStore((state) => state.setActiveSubject)
  const setTheme = useAppStore((state) => state.setTheme)
  const setMode = useAppStore((state) => state.setMode)
  const closePalette = useUiStore((state) => state.closePalette)
  const openSettings = useUiStore((state) => state.openSettings)
  const openSubjectSheet = useUiStore((state) => state.openSubjectSheet)
  const toast = useUiStore((state) => state.toast)

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const docs = useMemo(() => buildSearchIndex(subjects, books), [subjects, books])

  const pickDoc = (doc: SearchDoc) => {
    closePalette()
    if (doc.subjectId && doc.subjectId !== activeSubjectId) setActiveSubject(doc.subjectId)
    navigate(doc.hash)
  }

  const quickActions: PaletteEntry[] = useMemo(() => {
    const themeTarget = prefs.theme === 'dark' ? 'light' : 'dark'
    const modeTarget = prefs.mode === 'active' ? 'passive' : 'active'
    return [
      {
        id: 'action-new-track',
        group: 'Actions',
        label: 'Create a new subject track',
        subtitle: 'Four phases and a starter week',
        icon: <Plus size={15} />,
        keywords: 'new add subject track curriculum',
        run: () => {
          closePalette()
          openSubjectSheet()
        },
      },
      {
        id: 'action-settings',
        group: 'Actions',
        label: 'Open settings',
        subtitle: 'Theme, mode, storage and backup',
        icon: <Settings size={15} />,
        keywords: 'preferences backup import export storage data',
        run: () => {
          closePalette()
          openSettings()
        },
      },
      {
        id: 'action-theme',
        group: 'Actions',
        label: `Switch to ${themeTarget} theme`,
        subtitle: `Current: ${prefs.theme}`,
        icon: themeTarget === 'dark' ? <Moon size={15} /> : <Sun size={15} />,
        keywords: 'dark light theme appearance',
        run: () => {
          setTheme(themeTarget)
          closePalette()
          toast(`Theme set to ${themeTarget}.`, 'info', 2400)
        },
      },
      {
        id: 'action-mode',
        group: 'Actions',
        label: `Switch to ${modeTarget} mode`,
        subtitle:
          modeTarget === 'active' ? 'PC / deep work / gates' : 'Phone / commute / docs and canon',
        icon: modeTarget === 'active' ? <BrainCircuit size={15} /> : <BookOpen size={15} />,
        keywords: 'passive active study mode pc phone',
        run: () => {
          setMode(modeTarget)
          closePalette()
          toast(`Study mode set to ${modeTarget}.`, 'info', 2400)
        },
      },
      {
        id: 'action-backup',
        group: 'Actions',
        label: 'Export a JSON backup',
        subtitle: 'All local data, off-device',
        icon: <Download size={15} />,
        keywords: 'backup export json download save',
        run: () => {
          const result = exportBackupJson()
          closePalette()
          toast(`Backup downloaded · ${result.subjects} track${result.subjects === 1 ? '' : 's'}.`, 'success', 5200)
        },
      },
    ]
  }, [prefs.theme, prefs.mode, closePalette, openSettings, openSubjectSheet, setTheme, setMode, toast])

  const goEntries: PaletteEntry[] = useMemo(
    () =>
      VIEWS.map((view) => {
        const Icon = VIEW_ICONS[view.id] ?? LayoutDashboard
        return {
          id: `go-${view.id}`,
          group: 'Jump to',
          label: view.label,
          subtitle: `#/${view.id}`,
          icon: <Icon size={15} />,
          keywords: view.label,
          run: () => {
            closePalette()
            navigate(view.hash)
          },
        }
      }),
    [closePalette],
  )

  const groups = useMemo(() => {
    const normal = query.trim().toLowerCase()
    const matchingActions = normal
      ? quickActions.filter((entry) =>
          `${entry.label} ${entry.subtitle ?? ''} ${entry.keywords ?? ''}`.toLowerCase().includes(normal),
        )
      : quickActions
    const matchingGo = normal
      ? goEntries.filter((entry) => `${entry.label} ${entry.keywords ?? ''}`.toLowerCase().includes(normal))
      : goEntries
    const resultDocs = normal ? searchIndex(docs, query, 18) : []

    const resultEntries: PaletteEntry[] = resultDocs.map((doc) => {
      const Icon = KIND_ICON[doc.kind]
      return {
        id: `doc-${doc.kind}-${doc.id}`,
        group: 'Results',
        label: doc.title,
        subtitle: `${KIND_LABEL[doc.kind]}${doc.subjectName ? ` · ${doc.subjectName}` : ''}${
          doc.subtitle ? ` · ${doc.subtitle}` : ''
        }`,
        icon: <Icon size={15} />,
        run: () => pickDoc(doc),
      }
    })

    const built: { title: string; entries: PaletteEntry[] }[] = []
    if (matchingGo.length) built.push({ title: 'Jump to', entries: matchingGo })
    if (matchingActions.length) built.push({ title: 'Actions', entries: matchingActions })
    if (resultEntries.length) built.push({ title: 'Results', entries: resultEntries })
    return built
  }, [query, quickActions, goEntries, docs, activeSubjectId])

  const flat = useMemo(() => groups.flatMap((group) => group.entries), [groups])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(0, flat.length - 1)))
  }, [flat.length])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closePalette()
        return
      }
      if (flat.length === 0) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive((index) => (index + 1) % flat.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((index) => (index - 1 + flat.length) % flat.length)
      } else if (event.key === 'Enter') {
        const entry = flat[active]
        if (entry) {
          event.preventDefault()
          entry.run()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flat, active, closePalette])

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [active])

  let flatIndex = -1

  return createPortal(
    <div
      className="no-print fixed inset-0 z-[80] flex items-start justify-center bg-[rgba(3,7,12,0.62)] px-3 pt-[8vh] backdrop-blur-sm sm:pt-[11vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closePalette()
      }}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-s1 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
          <Search size={17} className="flex-none text-t3" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search weeks, nodes, cards, resources…"
            className="palette-search min-w-0 flex-1 bg-transparent text-[14px] text-t1 outline-none placeholder:text-t3"
            aria-label="Search everything"
            aria-controls="palette-results"
            aria-activedescendant={flat[active] ? `palette-${flat[active]!.id}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button
              type="button"
              className="text-t3 hover:text-t1"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
          <Kbd>esc</Kbd>
        </div>

        <div ref={listRef} className="scroll-thin max-h-[min(58vh,500px)] overflow-y-auto p-1.5" id="palette-results" role="listbox">
          {flat.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] font-semibold">No matches</p>
              <p className="muted mt-1 text-[12px]">
                Try a week title, node name, tag, failure mode or resource.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.title} className="mb-1">
                <p className="eyebrow px-2.5 pt-2 pb-1">{group.title}</p>
                {group.entries.map((entry) => {
                  flatIndex += 1
                  const index = flatIndex
                  const selected = index === active
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      id={`palette-${entry.id}`}
                      data-index={index}
                      onMouseEnter={() => setActive(index)}
                      onClick={entry.run}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition',
                        selected ? 'bg-accent-soft' : 'hover:bg-s2',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-7 w-7 flex-none place-items-center rounded-md border',
                          selected
                            ? 'border-accent/25 bg-s1 text-accent'
                            : 'border-line bg-s2 text-t3',
                        )}
                        aria-hidden
                      >
                        {entry.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium">{entry.label}</span>
                        {entry.subtitle ? (
                          <span className="faint block truncate text-[10.5px]">{entry.subtitle}</span>
                        ) : null}
                      </span>
                      {selected ? <ArrowRight size={13} className="flex-none text-accent" aria-hidden /> : null}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-s2/60 px-3.5 py-2">
          <span className="faint flex items-center gap-1 text-[10px]">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="faint flex items-center gap-1 text-[10px]">
            <Kbd>↵</Kbd> open
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-t3">
            <Command size={10} aria-hidden /> K anytime
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
