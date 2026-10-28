import type { AppData } from '../types/schema'

/**
 * Undo history is intentionally session-scoped. Snapshots hold references to
 * the previous immutable state, so an entry costs only the objects that the
 * action actually changed — not a full deep clone of the curriculum.
 */
export interface HistorySnapshot {
  subjects: AppData['subjects']
  books: AppData['books']
  dailyLog: AppData['dailyLog']
  overrides: AppData['overrides']
  prefs: AppData['prefs']
  planner: AppData['planner']
  promptOverrides: AppData['promptOverrides']
  activeSubjectId: string
  seedVersion: number
}

export interface HistoryEntry {
  id: string
  label: string
  at: number
  before: HistorySnapshot
  after: HistorySnapshot
}

export const HISTORY_LIMIT = 50

let undoStack: HistoryEntry[] = []
let redoStack: HistoryEntry[] = []
let sequence = 0
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function snapshotOf(data: AppData): HistorySnapshot {
  return {
    subjects: data.subjects,
    books: data.books,
    dailyLog: data.dailyLog,
    overrides: data.overrides,
    prefs: data.prefs,
    planner: data.planner,
    promptOverrides: data.promptOverrides,
    activeSubjectId: data.activeSubjectId,
    seedVersion: data.seedVersion,
  }
}

export function snapshotsEqual(a: HistorySnapshot, b: HistorySnapshot): boolean {
  return (
    a.subjects === b.subjects &&
    a.books === b.books &&
    a.dailyLog === b.dailyLog &&
    a.overrides === b.overrides &&
    a.prefs === b.prefs &&
    a.planner === b.planner &&
    a.promptOverrides === b.promptOverrides &&
    a.activeSubjectId === b.activeSubjectId &&
    a.seedVersion === b.seedVersion
  )
}

export function recordHistory(label: string, before: HistorySnapshot, after: HistorySnapshot): HistoryEntry {
  const entry: HistoryEntry = {
    id: `hist-${Date.now()}-${sequence++}`,
    label,
    at: Date.now(),
    before,
    after,
  }
  undoStack = [...undoStack, entry].slice(-HISTORY_LIMIT)
  redoStack = []
  emit()
  return entry
}

export function popUndo(): HistoryEntry | undefined {
  const entry = undoStack[undoStack.length - 1]
  if (!entry) return undefined
  undoStack = undoStack.slice(0, -1)
  redoStack = [...redoStack, entry]
  emit()
  return entry
}

export function popRedo(): HistoryEntry | undefined {
  const entry = redoStack[redoStack.length - 1]
  if (!entry) return undefined
  redoStack = redoStack.slice(0, -1)
  undoStack = [...undoStack, entry]
  emit()
  return entry
}

export function clearHistory(): void {
  undoStack = []
  redoStack = []
  emit()
}

export function historyDepth(): { undo: number; redo: number } {
  return { undo: undoStack.length, redo: redoStack.length }
}

/** Newest first, for an upcoming history drawer. */
export function listHistory(): HistoryEntry[] {
  return [...undoStack].reverse()
}

export function subscribeHistory(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
