import { useEffect, useRef } from 'react'
import { Target } from 'lucide-react'
import { useActiveSubject, useAppStore } from './store/AppStore'
import { useUiStore } from './store/uiStore'
import { go, useHashRoute } from './lib/router'
import { listHistory } from './services/history'
import { Spinner } from './components/ui/primitives'
import { AppShell } from './components/layout/AppShell'
import { CommandPalette } from './components/layout/CommandPalette'
import { SettingsSheet } from './components/layout/SettingsSheet'
import { Toaster } from './components/ui/Toaster'
import { StartView } from './features/start/StartView'
import { TodayView } from './features/today/TodayView'
import { PlanView } from './features/plan/PlanView'
import { PlanWeekPage } from './features/plan/PlanWeekPage'
import { NodesView } from './features/nodes/NodesView'
import { NodeSheet } from './features/nodes/NodeSheet'
import { RecallView } from './features/recall/RecallView'
import { VaultView } from './features/vault/VaultView'
import { ProgressView } from './features/progress/ProgressView'
import { HelpView } from './features/help/HelpView'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
}

export default function App() {
  const route = useHashRoute()
  const subject = useActiveSubject()
  const hydrated = useAppStore((state) => state.hydrated)
  const started = useAppStore((state) => state.journey.startedAt !== null)
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      if (isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()

      if (key === 'z') {
        event.preventDefault()
        const store = useAppStore.getState()
        if (event.shiftKey) {
          const ok = store.redo()
          toast(ok ? 'Redid the last change.' : 'Nothing to redo.', 'info', 2600)
        } else {
          const entry = listHistory()[0]
          const ok = store.undo()
          toast(ok ? `Undid: ${entry?.label ?? 'last change'}` : 'Nothing to undo.', 'info', 2600)
        }
        return
      }

      if (key === 'y' && !event.metaKey) {
        event.preventDefault()
        const ok = useAppStore.getState().redo()
        toast(ok ? 'Redid the last change.' : 'Nothing to redo.', 'info', 2600)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toast])

  if (!hydrated) {
    return (
      <div className="app-bg grid min-h-dvh place-items-center p-6">
        <div className="text-center">
          <span className="logo-mark mx-auto grid h-11 w-11 place-items-center">
            <Target size={22} strokeWidth={2.3} aria-hidden />
          </span>
          <p className="mt-3 text-[15px] font-bold tracking-tight">SkillMastery</p>
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
        {route.view === 'today' ? started ? <TodayView /> : <StartView /> : null}
        {route.view === 'start' ? <StartView /> : null}
        {route.view === 'plan' ? (
          route.detail?.kind === 'week' ? (
            <PlanWeekPage key={route.detail.id} weekId={route.detail.id} />
          ) : (
            <PlanView />
          )
        ) : null}
        {route.view === 'map' ? <NodesView /> : null}
        {route.view === 'practice' ? <RecallView /> : null}
        {route.view === 'library' ? <VaultView /> : null}
        {route.view === 'progress' ? <ProgressView /> : null}
        {route.view === 'help' ? <HelpView /> : null}
      </AppShell>

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
