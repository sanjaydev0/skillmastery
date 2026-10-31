import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ChangeEvent } from 'react'
import {
  ArchiveRestore,
  Database,
  Download,
  FileJson,
  FileText,
  HardDrive,
  KeyRound,
  Laptop,
  Moon,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { AppData, Mode, Theme, Weekday } from '../../types/schema'
import { DEFAULT_PLANNER } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { migrateAppData, parseBackupJson } from '../../services/validation'
import {
  isLocalStorageMirrorEnabled,
  isOverStorageGuard,
  requestPersistentStorage,
  storageEstimate,
  type StorageEstimate,
} from '../../services/storage'
import { exportBackupJson, exportObsidianMarkdown } from '../../services/exports'
import { formatBytes } from '../../lib/utils'
import { formatTotal, dailyCapacity } from '../../engine/estimates'
import { formatDateTime } from '../../lib/dates'
import { getInstallState, promptInstall, subscribeInstall } from '../../services/install'
import {
  AI_MAX_OUTPUT_TOKENS,
  AI_MAX_PROMPT_CHARS,
  AI_MODEL_LABEL,
  clearAiKey,
  setAiKey,
} from '../../services/ai'
import { useAiKey } from '../../hooks/useAiKey'
import { Sheet } from '../../components/ui/Sheet'
import { CapacitySliders } from '../../components/ui/CapacitySliders'
import { Alert, Badge, Button, InlineError, ProgressBar, SectionHead, Spinner } from '../../components/ui/primitives'

const THEMES: { id: Theme; label: string; icon: typeof Sun; detail: string }[] = [
  { id: 'light', label: 'Light', icon: Sun, detail: 'Paper daylight' },
  { id: 'dark', label: 'Dark', icon: Moon, detail: 'Focus at night' },
  { id: 'system', label: 'System', icon: Laptop, detail: 'Follow the OS' },
]

const MODES: { id: Mode; label: string; detail: string; examples: string }[] = [
  {
    id: 'passive',
    label: 'Passive',
    detail: 'Phone, commute, shop',
    examples: 'Docs, canon, paper drills, Socratic prompts',
  },
  {
    id: 'active',
    label: 'Active',
    detail: 'PC, deep work',
    examples: 'Builds, deliberate errors, tests, blind gates',
  },
]

const WEEK_MS = 7 * 86_400_000

/** Monday-first, matching every other day strip in the app. Values are schema weekdays. */
const STUDY_DAY_ORDER: { day: Weekday; label: string }[] = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
]

interface PendingImport {
  data: AppData
  exportedAt?: string
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const subject = useActiveSubject()
  const prefs = useAppStore((state) => state.prefs)
  const schemaVersion = useAppStore((state) => state.schemaVersion)
  const seedVersion = useAppStore((state) => state.seedVersion)
  const setTheme = useAppStore((state) => state.setTheme)
  const setMode = useAppStore((state) => state.setMode)
  const planner = useAppStore((state) => state.planner)
  const updatePlanner = useAppStore((state) => state.updatePlanner)
  const gameLayer = useAppStore((state) => state.journey.gameLayer)
  const setGameLayer = useAppStore((state) => state.setGameLayer)
  const importData = useAppStore((state) => state.importData)
  const trash = useAppStore((state) => state.trash)
  const resetToSeed = useAppStore((state) => state.resetToSeed)
  const toast = useUiStore((state) => state.toast)
  const openTrash = useUiStore((state) => state.openTrash)

  const inputRef = useRef<HTMLInputElement>(null)
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(true)
  const [protecting, setProtecting] = useState(false)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [importError, setImportError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [mirrorEnabled, setMirrorEnabled] = useState(true)
  const [aiDraft, setAiDraft] = useState('')
  const [aiError, setAiError] = useState('')
  const [managingCapacity, setManagingCapacity] = useState(false)
  const aiKey = useAiKey()
  const install = useSyncExternalStore(subscribeInstall, getInstallState)

  useEffect(() => {
    let alive = true
    void storageEstimate().then((value) => {
      if (!alive) return
      setEstimate(value)
      setEstimateLoading(false)
    })
    void isLocalStorageMirrorEnabled().then((enabled) => {
      if (!alive) return
      setMirrorEnabled(enabled)
    })
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      alive = false
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const backupStale = !prefs.lastExportAt || Date.now() - prefs.lastExportAt > WEEK_MS
  const overGuard = isOverStorageGuard(estimate?.usage ?? 0)
  const daily = dailyCapacity(planner)

  const toggleStudyDay = (day: Weekday) => {
    const next = planner.studyDays.includes(day)
      ? planner.studyDays.filter((entry) => entry !== day)
      : [...planner.studyDays, day]
    updatePlanner({ studyDays: next })
  }

  const runBackup = () => {
    const result = exportBackupJson()
    toast(
      `Backup downloaded · ${result.subjects} track${result.subjects === 1 ? '' : 's'} included. Store it off-device.`,
      'success',
      6000,
    )
  }

  const runObsidian = () => {
    const result = exportObsidianMarkdown()
    toast(`Obsidian export downloaded · ${result.nodes} node${result.nodes === 1 ? '' : 's'}.`, 'success', 5200)
  }

  const protect = async () => {
    setProtecting(true)
    const granted = await requestPersistentStorage()
    const next = await storageEstimate()
    setEstimate(next)
    setProtecting(false)
    toast(
      granted
        ? 'Persistent storage granted. The browser will not evict this data automatically.'
        : 'The browser declined persistent storage. Export JSON backups regularly.',
      granted ? 'success' : 'info',
      6000,
    )
  }

  const runInstall = async () => {
    setInstalling(true)
    const outcome = await promptInstall()
    setInstalling(false)
    if (outcome === 'accepted') {
      toast('Install accepted. SkillMastery will appear on your home screen.', 'success', 6000)
    } else if (outcome === 'dismissed') {
      toast('Install cancelled. You can use the browser menu to add it later.', 'info', 5000)
    } else {
      toast('The install prompt is not ready yet. Use the browser menu → Add to Home screen.', 'info', 6500)
    }
  }

  const saveAiKey = () => {
    const key = aiDraft.trim()
    if (key.length < 8) {
      setAiError('Paste the full Velona key. It is usually longer than eight characters.')
      return
    }
    setAiKey(key)
    setAiDraft('')
    setAiError('')
    toast('Velona key saved in this browser only. It is not part of your backups.', 'success', 6000)
  }

  const forgetAiKey = () => {
    clearAiKey()
    setAiDraft('')
    setAiError('')
    toast('Velona key removed from this browser.', 'info', 4500)
  }

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImportError('')
    setPending(null)
    try {
      const raw = await file.text()
      const parsed = parseBackupJson(raw)
      const migrated = migrateAppData(parsed.data)
      setPending({ data: migrated, exportedAt: parsed.exportedAt })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error'
      setImportError(message.length > 260 ? `${message.slice(0, 260)}…` : message)
    }
  }

  const applyImport = (mode: 'replace' | 'merge') => {
    if (!pending) return
    const tracks = pending.data.subjects.length
    const nodes = pending.data.subjects.reduce((sum, entry) => sum + entry.nodes.length, 0)
    importData(pending.data, mode)
    setPending(null)
    toast(
      mode === 'replace'
        ? `Backup restored: ${tracks} track${tracks === 1 ? '' : 's'}, ${nodes} node${nodes === 1 ? '' : 's'}.`
        : `Backup merged: ${tracks} track${tracks === 1 ? '' : 's'} reconciled by id.`,
      'success',
      6500,
    )
  }

  return (
    <Sheet
      title="Settings"
      eyebrow="Local-first control panel"
      onClose={onClose}
      footer={
        <>
          <span className="faint mr-auto hidden items-center gap-1.5 text-[11.5px] sm:flex">
            {online ? <Wifi size={11} /> : <WifiOff size={11} />}
            {online ? 'Network available' : 'Offline'} · app data stays on this device
          </span>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <SectionHead title="Appearance" eyebrow="Theme" />
          <div className="grid grid-cols-3 gap-1.5">
            {THEMES.map((theme) => {
              const Icon = theme.icon
              const active = prefs.theme === theme.id
              return (
                <button
                  key={theme.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTheme(theme.id)}
                  className={`rounded-xl border p-2.5 text-left transition ${
                    active
                      ? 'border-accent/40 bg-accent-soft'
                      : 'border-line bg-s1 hover:border-line-strong hover:bg-s2'
                  }`}
                >
                  <Icon size={15} className={active ? 'text-accent' : 'text-t3'} aria-hidden />
                  <p className="mt-1.5 text-[12px] font-semibold">{theme.label}</p>
                  <p className="faint text-[11px]">{theme.detail}</p>
                </button>
              )
            })}
          </div>
          <p className="faint mt-1.5 text-[11.5px]">
            The accent colour follows the active track. Reduced motion is respected automatically.
          </p>
        </section>

        <section>
          <SectionHead title="Study mode" eyebrow="Passive / active rhythm" />
          <div className="grid gap-1.5 sm:grid-cols-2">
            {MODES.map((mode) => {
              const active = prefs.mode === mode.id
              return (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(mode.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-accent/40 bg-accent-soft'
                      : 'border-line bg-s1 hover:border-line-strong hover:bg-s2'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold">{mode.label}</p>
                    {active ? <Badge tone="accent">Current</Badge> : null}
                  </div>
                  <p className="faint mt-0.5 text-[11.5px]">{mode.detail}</p>
                  <p className="muted mt-1 text-[11.5px] leading-relaxed">{mode.examples}</p>
                </button>
              )
            })}
          </div>
          <p className="faint mt-1.5 text-[11.5px]">
            Mode filters the daily rhythm and the week checklist. It does not change stored mastery.
          </p>
        </section>

        <section>
          <SectionHead
            title="Game layer"
            eyebrow="Optional · level, quests and marks"
            action={<Badge tone={gameLayer ? 'good' : 'neutral'}>{gameLayer ? 'On' : 'Off'}</Badge>}
          />
          <div className="rounded-xl border border-line bg-s2 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-medium">Show level, XP, quests, the boss and marks</p>
                <p className="faint mt-0.5 text-[11.5px] leading-relaxed">
                  Everything here is counted from checked tasks, cleared checkpoints and finished weeks. Turning it off
                  only hides the surface. Nothing is lost, and a pause never takes a mark or XP away.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={gameLayer}
                aria-label="Show the game layer"
                onClick={() => setGameLayer(!gameLayer)}
                className={`relative h-6 w-11 flex-none rounded-full border transition ${
                  gameLayer ? 'border-accent/50 bg-accent' : 'border-line bg-s3'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-s1 transition ${
                    gameLayer ? 'left-[22px]' : 'left-0.5'
                  }`}
                  aria-hidden
                />
              </button>
            </div>
          </div>
        </section>

        <section>
          <SectionHead
            title="Study week"
            eyebrow="Capacity · the days you actually study"
            action={<Badge tone="neutral">{planner.studyDays.length} of 7</Badge>}
          />
          <div className="rounded-xl border border-line bg-s2 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold">Weekly hours</p>
                <p className="faint mt-0.5 text-[11.5px] leading-relaxed">
                  {formatTotal({ min: daily.active, max: daily.active })} active +{' '}
                  {formatTotal({ min: daily.passive, max: daily.passive })} passive per study day
                </p>
              </div>
              {!managingCapacity ? (
                <Button variant="outline" size="sm" onClick={() => setManagingCapacity(true)}>
                  Manage
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setManagingCapacity(false)}>
                  OK
                </Button>
              )}
            </div>
            <div className="mt-3">
              <CapacitySliders showSummary={false} disabled={!managingCapacity} />
            </div>
            <div className="mt-3 border-t border-line pt-2.5">
              <p className="text-[12px] font-medium">Study days</p>
              <p className="faint mt-0.5 text-[11.5px] leading-relaxed">
                The weekly hours are split across these days. A day you leave off is not a failure; it is a day the
                plan does not count on.
              </p>
              <div className="mt-2 grid grid-cols-7 gap-1" role="group" aria-label="Study days">
                {STUDY_DAY_ORDER.map((entry) => {
                  const active = planner.studyDays.includes(entry.day)
                  const lastOne = active && planner.studyDays.length === 1
                  return (
                    <button
                      key={entry.day}
                      type="button"
                      aria-pressed={active}
                      disabled={lastOne || !managingCapacity}
                      title={lastOne ? 'Keep at least one study day' : !managingCapacity ? 'Click Manage to change' : undefined}
                      onClick={() => toggleStudyDay(entry.day)}
                      className={`min-h-11 rounded-lg border px-1 text-[11.5px] font-medium transition ${
                        active
                          ? 'border-accent/40 bg-accent-soft text-t1'
                          : 'border-line bg-s1 text-t3 hover:border-line-strong hover:text-t2'
                      } ${lastOne || !managingCapacity ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      {entry.label}
                    </button>
                  )
                })}
              </div>
              {managingCapacity && (
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={planner.studyDays.length === 7}
                    onClick={() => updatePlanner({ studyDays: [...DEFAULT_PLANNER.studyDays] })}
                  >
                    Use all seven days
                  </Button>
                </div>
              )}
            </div>
          </div>
          <p className="faint mt-1.5 text-[11.5px]">
            Capacity is device-local. Importing a backup never overwrites it.
          </p>
        </section>

        <section>
          <SectionHead
            title="AI helper"
            eyebrow="Velona · optional"
            action={
              <Badge tone={aiKey ? 'good' : 'neutral'}>{aiKey ? 'Key saved' : 'Not configured'}</Badge>
            }
          />
          <div className="rounded-xl border border-line bg-s2 p-3">
            <div className="flex items-start gap-2.5">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl border border-accent/25 bg-accent-soft text-accent">
                <Sparkles size={17} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <KeyRound size={13} className="text-t3" aria-hidden />
                  <p className="text-[12px] font-semibold">Prompt runner</p>
                </div>
                <p className="muted mt-1 text-[11.5px] leading-relaxed">
                  Optional. Run a rendered prompt against {AI_MODEL_LABEL} from the Practice → Prompts tab. The key
                  is stored in this browser and sent to Velona only when you press Run.
                </p>
                <label className="label mt-2.5" htmlFor="ai-key">
                  Velona API key
                </label>
                <input
                  id="ai-key"
                  className="input"
                  type="password"
                  value={aiDraft}
                  onChange={(event) => {
                    setAiDraft(event.target.value)
                    setAiError('')
                  }}
                  placeholder={aiKey ? 'Saved key — paste a new one to replace it' : 'Paste your key from velona.in'}
                  autoComplete="off"
                  spellCheck={false}
                />
                {aiError ? <InlineError>{aiError}</InlineError> : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="primary" onClick={saveAiKey} disabled={!aiDraft.trim()}>
                    Save key
                  </Button>
                  {aiKey ? (
                    <Button size="sm" variant="outline" icon={<Trash2 size={13} />} onClick={forgetAiKey}>
                      Forget key
                    </Button>
                  ) : null}
                  <a
                    className="link text-[11px]"
                    href="https://velona.in"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Get a Velona key
                  </a>
                </div>
                <p className="faint mt-1.5 text-[11px] leading-relaxed">
                  Prompt cap {AI_MAX_PROMPT_CHARS.toLocaleString()} characters · output cap{' '}
                  {AI_MAX_OUTPUT_TOKENS.toLocaleString()} tokens. The same-origin proxy forwards the key per request
                  and does not store or log it. Keys never enter JSON backups or Obsidian exports.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHead title="Install app" eyebrow="Home screen · offline" />
          <div className="rounded-xl border border-line bg-s2 p-3">
            <div className="flex items-start gap-2.5">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl border border-accent/25 bg-accent-soft text-accent">
                <Smartphone size={17} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold">SkillMastery on this device</p>
                  <Badge tone={install.installed ? 'good' : install.canInstall ? 'accent' : 'neutral'}>
                    {install.installed ? 'Installed' : install.canInstall ? 'Ready' : 'Browser install'}
                  </Badge>
                </div>
                <p className="muted mt-1 text-[11.5px] leading-relaxed">
                  {install.installed
                    ? 'Running as an installed app. Launch it from your home screen; it opens offline after the first load.'
                    : 'Adds a standalone home-screen icon and caches the app shell so your local study data opens without a connection.'}
                </p>
                {install.canInstall ? (
                  <Button
                    size="sm"
                    variant="primary"
                    className="mt-2"
                    icon={<Smartphone size={13} />}
                    loading={installing}
                    onClick={() => void runInstall()}
                  >
                    Install app
                  </Button>
                ) : null}
                {!install.installed && !install.canInstall ? (
                  <div className="mt-2 rounded-lg border border-line bg-s1 px-2.5 py-2">
                    <p className="faint text-[11.5px] leading-relaxed">
                      <strong className="text-t2">Android Chrome:</strong> ⋮ menu → <strong>Add to Home screen</strong> (or{' '}
                      <strong>Install app</strong>). <strong className="text-t2">iPhone Safari:</strong> Share → Add to Home
                      Screen.
                    </p>
                    <p className="faint mt-1 text-[11px] leading-relaxed">
                      Chrome offers its install prompt once the app has been opened over HTTPS or localhost and the offline
                      service worker is active.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHead title="Storage" eyebrow="Truthful, local, exportable" />
          <div className="rounded-xl border border-line bg-s2 p-3">
            {estimateLoading ? (
              <div className="flex items-center gap-2 text-[12px] text-t3">
                <Spinner size={14} /> Reading browser storage…
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HardDrive size={15} className="text-t2" aria-hidden />
                    <div>
                      <p className="text-[12px] font-semibold">
                        {estimate?.usage ? formatBytes(estimate.usage) : 'No measurable data'}
                        {estimate?.quota ? (
                          <span className="faint font-normal"> of ~{formatBytes(estimate.quota)} quota</span>
                        ) : null}
                      </p>
                      <p className="faint text-[11.5px]">
                        IndexedDB primary · localStorage mirror · versioned JSON
                      </p>
                    </div>
                  </div>
                  <Badge tone={estimate?.persisted ? 'good' : 'neutral'}>
                    {estimate?.persisted ? 'Persistent' : 'Best effort'}
                  </Badge>
                </div>
                {estimate?.quota ? (
                  <ProgressBar
                    value={estimate.usage / estimate.quota}
                    tone={estimate.usage / estimate.quota > 0.8 ? 'warn' : 'accent'}
                    className="mt-2.5"
                    label="Storage used"
                  />
                ) : null}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<ShieldCheck size={13} />}
                    onClick={() => void protect()}
                    loading={protecting}
                    disabled={estimate?.persisted}
                  >
                    {estimate?.persisted ? 'Storage protected' : 'Request persistent storage'}
                  </Button>
                  <span className="faint self-center text-[11px]">
                    Protection asks the browser to keep this origin from automatic eviction.
                  </span>
                </div>
                <p className="faint mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed">
                  This app keeps a 4 MB budget on this device. Saved data above it shows a reminder to export a
                  backup. The budget is fixed, not a setting: IndexedDB stays the source of truth and nothing is
                  deleted to meet it.
                </p>
                {overGuard ? (
                  <p className="mt-2 rounded-lg border border-warn/30 bg-warn-soft px-2 py-1.5 text-[11px] text-t1">
                    Saved data is past the 4 MB budget. Export a JSON backup, then delete a track or a week you no
                    longer need.
                  </p>
                ) : null}
                {!mirrorEnabled && (
                  <p className="mt-2.5 text-[11px] text-t3">
                    localStorage mirror off · saved data is past the 4 MB mirror limit · IndexedDB remains the source
                    of truth
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <section>
          <SectionHead
            title="Backup & restore"
            eyebrow="Your only safety net"
            action={
              <Badge tone={backupStale ? 'warn' : 'good'}>
                {prefs.lastExportAt ? formatDateTime(prefs.lastExportAt) : 'Never exported'}
              </Badge>
            }
          />
          {backupStale ? (
            <Alert tone="warn" icon={<Database size={15} />} title="A JSON backup is overdue">
              <p>
                Storage is device-local. A browser reset, profile wipe or uninstall removes this data. Export a
                backup and keep it outside this machine.
              </p>
            </Alert>
          ) : null}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-s1 p-3">
              <div className="flex items-center gap-2">
                <FileJson size={15} className="text-accent" aria-hidden />
                <p className="text-[12px] font-semibold">Full JSON backup</p>
              </div>
              <p className="muted mt-1 text-[11px] leading-relaxed">
                Every track, week, node, card, SRS state, daily check-in, override and preference.
              </p>
              <Button size="sm" variant="primary" className="mt-2 w-full" icon={<Download size={13} />} onClick={runBackup}>
                Export backup
              </Button>
            </div>
            <div className="rounded-xl border border-line bg-s1 p-3">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-info" aria-hidden />
                <p className="text-[12px] font-semibold">Obsidian notes</p>
              </div>
              <p className="muted mt-1 text-[11px] leading-relaxed">
                Active track as Markdown: phases, weeks, nodes, knowledge points and reading canon.
              </p>
              <Button size="sm" variant="outline" className="mt-2 w-full" icon={<Download size={13} />} onClick={runObsidian}>
                Export .md
              </Button>
            </div>
          </div>

          <div className="mt-2 rounded-xl border border-line bg-s1 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold">Restore from a JSON backup</p>
                <p className="muted mt-0.5 text-[11px]">
                  Validated against the current schema before anything is written. Corrupt files are rejected.
                </p>
              </div>
              <Upload size={15} className="flex-none text-t3" aria-hidden />
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => void readFile(event)}
            />
            <Button
              size="sm"
              variant="soft"
              className="mt-2"
              icon={<Upload size={13} />}
              onClick={() => inputRef.current?.click()}
            >
              Choose backup file
            </Button>

            {importError ? (
              <p className="mt-2 rounded-lg border border-bad/25 bg-bad-soft px-2.5 py-2 text-[11px] leading-relaxed text-bad" role="alert">
                Import rejected: {importError}
              </p>
            ) : null}

            {pending ? (
              <div className="mt-2 rounded-lg border border-accent/25 bg-accent-soft p-2.5">
                <p className="text-[11.5px] font-semibold">Backup validated</p>
                <p className="muted mt-0.5 text-[11.5px] leading-relaxed">
                  {pending.data.subjects.length} track
                  {pending.data.subjects.length === 1 ? '' : 's'} ·{' '}
                  {pending.data.subjects.reduce((sum, entry) => sum + entry.nodes.length, 0)} nodes ·{' '}
                  {pending.data.subjects.reduce((sum, entry) => sum + entry.cards.length, 0)} cards
                  {pending.exportedAt ? ` · exported ${formatDateTime(Date.parse(pending.exportedAt))}` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="danger" onClick={() => applyImport('replace')}>
                    Replace everything
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => applyImport('merge')}>
                    Merge by id
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPending(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <SectionHead
            title="Recently deleted"
            eyebrow="Restore a week or a track"
            action={<Badge tone={trash.length > 0 ? 'warn' : 'neutral'}>{trash.length} saved</Badge>}
          />
          <div className="rounded-xl border border-line bg-s2 p-3">
            <p className="text-[12px] font-semibold">Deleting is recoverable</p>
            <p className="faint mt-0.5 text-[11.5px] leading-relaxed">
              A deleted week keeps its concepts, cards and graph edges. A deleted track keeps its weeks. The last 20
              deletions wait here on this device.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" icon={<ArchiveRestore size={13} />} onClick={openTrash}>
                {trash.length > 0 ? `Open recently deleted (${trash.length})` : 'Open recently deleted'}
              </Button>
              <span className="faint text-[11px]">Nothing is sent anywhere.</span>
            </div>
          </div>
        </section>

        <section>
          <SectionHead title="Reset" eyebrow="Danger zone" />
          <div className="rounded-xl border border-bad/25 bg-bad-soft p-3">
            <p className="text-[12px] font-semibold text-bad">Reset to the seed curriculum</p>
            <p className="muted mt-1 text-[11.5px] leading-relaxed">
              Deletes every custom track, node, card, check-in, override and reading update, then restores the two
              original 24-week tracks. Theme and mode survive. Export first if you are unsure.
            </p>
            {confirmReset ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  icon={<RotateCcw size={13} />}
                  onClick={() => {
                    resetToSeed()
                    setConfirmReset(false)
                    toast('All data reset to the seed curriculum.', 'info', 6000)
                  }}
                >
                  Yes, reset everything
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="danger"
                className="mt-2"
                icon={<RotateCcw size={13} />}
                onClick={() => setConfirmReset(true)}
              >
                Reset to seed
              </Button>
            )}
          </div>
        </section>

        <div className="border-t border-line pt-3">
          <p className="faint text-[11.5px] leading-relaxed">
            {subject.shortName} · schema v{schemaVersion} · seed v{seedVersion}. No account, no analytics, no
            network requests for app data. Exports are generated in your browser.
          </p>
        </div>
      </div>
    </Sheet>
  )
}
