import { useMemo, useSyncExternalStore } from 'react'

export type ViewName = 'overview' | 'curriculum' | 'nodes' | 'recall' | 'vault'

export interface Route {
  view: ViewName
  detail?: { kind: 'week' | 'node'; id: string }
}

export const VIEWS: { id: ViewName; label: string; hash: string }[] = [
  { id: 'overview', label: 'Overview', hash: '#/overview' },
  { id: 'curriculum', label: 'Curriculum', hash: '#/curriculum' },
  { id: 'nodes', label: 'Knowledge nodes', hash: '#/nodes' },
  { id: 'recall', label: 'Recall', hash: '#/recall' },
  { id: 'vault', label: 'Vault', hash: '#/vault' },
]

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

function getHash(): string {
  return window.location.hash || '#/overview'
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? ''
  const [head, id] = path.split('/')
  if (head === 'week' && id) return { view: 'curriculum', detail: { kind: 'week', id } }
  if (head === 'node' && id) return { view: 'nodes', detail: { kind: 'node', id } }
  const view = VIEWS.find((entry) => entry.id === head)?.id ?? 'overview'
  return { view }
}

export function useHashRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '#/overview')
  return useMemo(() => parseHash(hash), [hash])
}

export function navigate(hash: string): void {
  if (window.location.hash === hash) return
  window.location.hash = hash
}

export function go(view: ViewName): void {
  navigate(`#/${view}`)
}
