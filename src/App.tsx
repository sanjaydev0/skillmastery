import { useEffect, useRef } from 'react'
import { Target } from 'lucide-react'
import { useActiveSubject, useAppStore } from './store/AppStore'
import { useUiStore } from './store/uiStore'
import { go, useHashRoute } from './lib/router'
import { Spinner } from './components/ui/primitives'
import { AppShell } from './components/layout/AppShell'
import { CommandPalette } from './components/layout/CommandPalette'
import { SettingsSheet } from './components/layout/SettingsSheet'
import { Toaster } from './components/ui/Toaster'
import { OverviewView } from './features/overview/OverviewView'
import { CurriculumView } from './features/curriculum/CurriculumView'
import { WeekSheet } from './features/curriculum/WeekSheet'
import { NodesView } from './features/nodes/NodesView'
import { NodeSheet } from './features/nodes/NodeSheet'
import { RecallView } from './features/recall/RecallView'
import { VaultView } from './features/vault/VaultView'

export default function App() {
  const route = useHashRoute()
  const subject = useActiveSubject()
  const hydrated = useAppStore((state) => state.hydrated)
  const bootIssue = useAppStore((state) => state.bootIssue)
  const paletteOpen = useUiStore((state) => state.paletteOpen)
  const settingsOpen = useUiStore((state) => state.settingsOpen)
  const toast = useUiStore((state) => state.toast)
  const bootToastShown = useRef(false)

  useEffect(() => {
    if (bootIssue !== 'corrupt' || bootToastShown.current) return
    bootToastShown.current = true
    toast(
      'The previous local data could not be validated. A fresh seed was opened; the unreadable copy was quarantined.',
      'error',
      9000,
    )
  }, [bootIssue, toast])

  useEffect(() => {
    const detail = route.detail
    if (!detail) return
    const exists =
      detail.kind === 'week'
        ? subject.weeks.some((week) => week.id === detail.id)
        : subject.nodes.some((node) => node.id === detail.id)
    if (!exists) {
      toast(
        detail.kind === 'week'
          ? 'That week is not in the active track. It may have been deleted or belong to another track.'
          : 'That knowledge node is not in the active track. It may have been deleted or belong to another track.',
        'info',
        5000,
      )
      go(route.view)
    }
  }, [route.detail, route.view, subject.id, subject.weeks, subject.nodes, toast])

  if (!hydrated) {
    return (
      <div className="app-bg grid min-h-dvh place-items-center p-6">
        <div className="text-center">
          <span className="logo-mark mx-auto grid h-11 w-11 place-items-center">
            <Target size={22} strokeWidth={2.3} aria-hidden />
          </span>
          <p className="mt-3 text-[15px] font-bold tracking-tight">MasteryHarness</p>
          <p className="muted mt-1 text-[12px]">Hydrating your local learning state…</p>
          <div className="mt-3 flex justify-center">
            <Spinner size={15} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <AppShell route={route}>
        {route.view === 'overview' ? <OverviewView /> : null}
        {route.view === 'curriculum' ? <CurriculumView /> : null}
        {route.view === 'nodes' ? <NodesView /> : null}
        {route.view === 'recall' ? <RecallView /> : null}
        {route.view === 'vault' ? <VaultView /> : null}
      </AppShell>

      {route.detail?.kind === 'week' ? (
        <WeekSheet
          key={`week-${route.detail.id}`}
          weekId={route.detail.id}
          onClose={() => go(route.view)}
        />
      ) : null}
      {route.detail?.kind === 'node' ? (
        <NodeSheet
          key={`node-${route.detail.id}`}
          nodeId={route.detail.id}
          onClose={() => go(route.view)}
        />
      ) : null}

      {paletteOpen ? <CommandPalette /> : null}
      {settingsOpen ? <SettingsSheet onClose={() => useUiStore.getState().closeSettings()} /> : null}
      <Toaster />
    </>
  )
}
