import { useEffect } from 'react'
import type { ReactNode } from 'react'
import {
  BrainCircuit,
  CalendarRange,
  ChevronsLeft,
  ChevronsRight,
  Command,
  LayoutDashboard,
  Library,
  Moon,
  Network,
  Search,
  Settings,
  Sun,
  Target,
} from 'lucide-react'
import type { ViewName } from '../../lib/router'
import { VIEWS, navigate, useHashRoute } from '../../lib/router'
import { useActiveSubject, useActiveWeek, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { cn } from '../../lib/utils'
import { formatShortDate } from '../../lib/dates'
import { weekProgress } from '../../engine/gating'
import { persistTheme } from '../../services/storage'
import { TrackSwitcher } from './TrackSwitcher'
import { SavedIndicator } from './SavedIndicator'
import { ModePill } from './ModePill'
import { SubjectCreateSheet } from './SubjectCreateSheet'
import { IconButton } from '../ui/primitives'

const NAV_ICONS: Record<ViewName, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  curriculum: CalendarRange,
  nodes: Network,
  recall: BrainCircuit,
  vault: Library,
}

const MOBILE_LABELS: Record<ViewName, string> = {
  overview: 'Overview',
  curriculum: 'Plan',
  nodes: 'Nodes',
  recall: 'Recall',
  vault: 'Vault',
}

function viewLabel(view: ViewName): string {
  return VIEWS.find((entry) => entry.id === view)?.label ?? 'Overview'
}

export function AppShell({ children, route }: { children: ReactNode; route: ReturnType<typeof useHashRoute> }) {
  const subject = useActiveSubject()
  const prefs = useAppStore((state) => state.prefs)
  const setTheme = useAppStore((state) => state.setTheme)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const openPalette = useUiStore((state) => state.openPalette)
  const openSettings = useUiStore((state) => state.openSettings)
  const togglePalette = useUiStore((state) => state.togglePalette)
  const subjectSheetOpen = useUiStore((state) => state.subjectSheetOpen)
  const closeSubjectSheet = useUiStore((state) => state.closeSubjectSheet)
  const week = useActiveWeek()

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const root = document.documentElement
    const apply = () => {
      const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
      root.style.colorScheme = dark ? 'dark' : 'light'
      root.dataset.accent = subject.accent
      persistTheme(prefs.theme, dark)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', dark ? '#080b10' : '#f5f7fa')
    }
    apply()
    if (prefs.theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [prefs.theme, subject.accent])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        togglePalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePalette])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route.view])

  const nextTheme = prefs.theme === 'dark' ? 'light' : 'dark'

  return (
    <div className="app-bg min-h-dvh">
      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-s1 md:flex',
          prefs.sidebarCollapsed ? 'w-[76px]' : 'w-[252px]',
        )}
        aria-label="Primary sidebar"
      >
        <div
          className={cn(
            'flex h-[60px] flex-none items-center gap-2.5 border-b border-line px-3.5',
            prefs.sidebarCollapsed && 'justify-center px-0',
          )}
        >
          <span className="logo-mark grid h-8 w-8 flex-none place-items-center" aria-hidden>
            <Target size={17} strokeWidth={2.4} />
          </span>
          {!prefs.sidebarCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold tracking-tight">MasteryHarness</p>
              <p className="faint -mt-0.5 text-[9.5px] tracking-[0.14em] uppercase">Learning OS</p>
            </div>
          ) : null}
        </div>

        <div className={cn('flex-none', prefs.sidebarCollapsed ? 'px-3 py-3' : 'p-3')}>
          <TrackSwitcher compact={prefs.sidebarCollapsed} />
        </div>

        <nav className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2.5 pt-1" aria-label="Views">
          <ul className="space-y-1">
            {VIEWS.map((entry) => {
              const Icon = NAV_ICONS[entry.id]
              const active = route.view === entry.id
              return (
                <li key={entry.id}>
                  <a
                    href={entry.hash}
                    aria-current={active ? 'page' : undefined}
                    title={prefs.sidebarCollapsed ? entry.label : undefined}
                    className={cn(
                      'group relative flex h-10 items-center gap-2.5 rounded-[10px] px-2.5 text-[12.5px] font-medium transition',
                      active
                        ? 'bg-accent-soft text-accent-strong'
                        : 'text-t2 hover:bg-s2 hover:text-t1',
                      prefs.sidebarCollapsed && 'justify-center px-0',
                    )}
                  >
                    <Icon
                      size={17}
                      strokeWidth={active ? 2.4 : 2}
                      className={cn('flex-none', active ? 'text-accent' : 'text-t3 group-hover:text-t2')}
                      aria-hidden
                    />
                    {!prefs.sidebarCollapsed ? <span>{entry.label}</span> : null}
                    {active && !prefs.sidebarCollapsed ? (
                      <span className="absolute right-2 h-1 w-1 rounded-full bg-accent" aria-hidden />
                    ) : null}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {!prefs.sidebarCollapsed ? (
          <div className="flex-none px-2.5">
            {week ? (
              <button
                type="button"
                onClick={() => navigate(`#/week/${week.id}`)}
                className="w-full rounded-xl border border-line bg-s2 p-3 text-left transition hover:border-line-strong"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow">This week</span>
                  <span className="num faint text-[10.5px]">
                    W{week.weekNumber}/{subject.weeks.length}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug font-semibold">{week.title}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="rail !h-1.5 flex-1">
                    <span style={{ width: `${Math.round(weekProgress(week) * 100)}%` }} />
                  </div>
                  <span className="faint num text-[10px]">{Math.round(weekProgress(week) * 100)}%</span>
                </div>
                {week.gate.attempts.length > 0 ? (
                  <p className="faint mt-1.5 text-[10px]">
                    Last gate {formatShortDate(week.gate.attempts[week.gate.attempts.length - 1]!.at)}
                  </p>
                ) : null}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('#/curriculum')}
                className="w-full rounded-xl border border-dashed border-line-strong p-3 text-left text-[11.5px] text-t2 hover:bg-s2"
              >
                Add this track's first week →
              </button>
            )}
          </div>
        ) : null}

        <div className={cn('mt-2 flex flex-none items-center gap-1 border-t border-line p-2.5', prefs.sidebarCollapsed && 'flex-col')}>
          <button
            type="button"
            onClick={toggleSidebar}
            className="icon-btn"
            aria-label={prefs.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={prefs.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {prefs.sidebarCollapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
          </button>
          {!prefs.sidebarCollapsed ? (
            <>
              <div className="min-w-0 flex-1 px-1">
                <p className="truncate text-[11px] font-medium">{subject.shortName}</p>
                <p className="faint text-[9.5px]">IndexedDB · offline</p>
              </div>
              <IconButton label="Open settings" onClick={openSettings}>
                <Settings size={16} />
              </IconButton>
            </>
          ) : (
            <IconButton label="Open settings" onClick={openSettings}>
              <Settings size={16} />
            </IconButton>
          )}
        </div>
      </aside>

      <div
        className={cn(
          'min-h-dvh transition-[padding] duration-200 md:pl-[252px]',
          prefs.sidebarCollapsed && 'md:pl-[76px]',
        )}
      >
        <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
          <div className="hidden h-[60px] items-center gap-3 px-5 md:flex lg:px-7">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="eyebrow truncate">{subject.shortName}</span>
                <span className="faint text-[10px]">/</span>
                <span className="faint text-[11px]">{viewLabel(route.view)}</span>
              </div>
              <p className="mt-0.5 hidden text-[12.5px] font-semibold lg:block">
                {route.detail ? 'Detail view' : 'Your command center'}
              </p>
            </div>

            <button
              type="button"
              onClick={openPalette}
              className="hidden h-9 w-[min(360px,34vw)] items-center gap-2 rounded-[10px] border border-line bg-s1 px-3 text-left text-[12px] text-t3 transition hover:border-line-strong xl:flex"
            >
              <Search size={14} className="flex-none" aria-hidden />
              <span className="flex-1 truncate">Search weeks, nodes, cards…</span>
              <span className="flex items-center gap-0.5 rounded border border-line bg-s2 px-1 py-0.5 font-mono text-[9.5px]">
                <Command size={9} /> K
              </span>
            </button>

            <div className="flex flex-none items-center gap-1">
              <ModePill />
              <span className="mx-1 h-5 w-px bg-line" aria-hidden />
              <SavedIndicator />
              <IconButton
                label={`Switch to ${nextTheme} theme`}
                onClick={() => setTheme(nextTheme)}
                title={`Theme: ${prefs.theme}. Switch to ${nextTheme}.`}
              >
                {prefs.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </IconButton>
              <IconButton label="Search" onClick={openPalette} className="xl:hidden">
                <Search size={17} />
              </IconButton>
              <IconButton label="Open settings" onClick={openSettings}>
                <Settings size={17} />
              </IconButton>
            </div>
          </div>

          {/* mobile header */}
          <div className="md:hidden">
            <div className="flex h-[56px] items-center gap-2 px-3">
              <span className="logo-mark grid h-7 w-7 flex-none place-items-center" aria-hidden>
                <Target size={15} strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold tracking-tight">MasteryHarness</p>
                <p className="faint -mt-0.5 text-[9px] tracking-[0.12em] uppercase">{viewLabel(route.view)}</p>
              </div>
              <IconButton label="Search everything" onClick={openPalette}>
                <Search size={18} />
              </IconButton>
              <IconButton label="Open settings" onClick={openSettings}>
                <Settings size={18} />
              </IconButton>
            </div>
            <div className="flex h-[56px] items-center gap-2 border-t border-line px-3">
              <div className="min-w-0 max-w-[164px] flex-1">
                <TrackSwitcher dense />
              </div>
              <ModePill labels={false} />
              <div className="ml-auto">
                <SavedIndicator compact />
              </div>
            </div>
          </div>
        </header>

        <main className="page">{children}</main>
      </div>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-s1/95 backdrop-blur-xl md:hidden"
        aria-label="Mobile views"
      >
        <div className="safe-bottom grid grid-cols-5">
          {VIEWS.map((entry) => {
            const Icon = NAV_ICONS[entry.id]
            const active = route.view === entry.id
            return (
              <a
                key={entry.id}
                href={entry.hash}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition',
                  active ? 'text-accent' : 'text-t3',
                )}
              >
                <span
                  className={cn(
                    'grid h-7 w-10 place-items-center rounded-full transition',
                    active && 'bg-accent-soft',
                  )}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} aria-hidden />
                </span>
                <span>{MOBILE_LABELS[entry.id]}</span>
              </a>
            )
          })}
        </div>
      </nav>

      {subjectSheetOpen ? <SubjectCreateSheet onClose={closeSubjectSheet} /> : null}
    </div>
  )
}
