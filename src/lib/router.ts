import { useMemo, useSyncExternalStore } from 'react'

export type ViewName =
  | 'today'
  | 'plan'
  | 'map'
  | 'practice'
  | 'library'
  | 'progress'
  | 'help'
  | 'start'

export interface Route {
  view: ViewName
  detail?: { kind: 'week' | 'node'; id: string }
}

/**
 * Day 0 and the course clock are a route, not a tab. It is reachable from
 * Today, the command palette and the mobile More sheet, and it must stay out of
 * the seven daily views so the sidebar does not grow an eighth item.
 */
export const START_VIEW = { id: 'start', label: 'Day 0', hash: '#/start' } as const

export const VIEWS: { id: ViewName; label: string; hash: string }[] = [
  { id: 'today', label: 'Today', hash: '#/today' },
  { id: 'plan', label: 'Plan', hash: '#/plan' },
  { id: 'map', label: 'Map', hash: '#/map' },
  { id: 'practice', label: 'Practice', hash: '#/practice' },
  { id: 'library', label: 'Library', hash: '#/library' },
  { id: 'progress', label: 'Progress', hash: '#/progress' },
  { id: 'help', label: 'Help', hash: '#/help' },
]

/** Old links keep working after the information architecture change. */
const LEGACY_VIEWS: Record<string, ViewName> = {
  overview: 'today',
  curriculum: 'plan',
  nodes: 'map',
  recall: 'practice',
  vault: 'library',
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

function getHash(): string {
  return window.location.hash || '#/today'
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? ''
  const [head, id] = path.split('/')
  if ((head === 'week' || head === 'plan') && id) return { view: 'plan', detail: { kind: 'week', id } }
  if (head === 'node' && id) return { view: 'map', detail: { kind: 'node', id } }
  if (head === 'start') return { view: 'start' }
  if (head && LEGACY_VIEWS[head]) return { view: LEGACY_VIEWS[head] }
  const view = VIEWS.find((entry) => entry.id === head)?.id ?? 'today'
  return { view }
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '#/today')
  return useMemo(() => parseHash(hash), [hash])
}

export function navigate(hash: string): void {
  if (window.location.hash === hash) return
  window.location.hash = hash
}

export function go(view: ViewName): void {
  navigate(`#/${view}`)
}
