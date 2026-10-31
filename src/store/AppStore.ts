import { create } from 'zustand'
import type {
  AppData,
  Book,
  CardSource,
  ChecklistItem,
  DayPlan,
  DayPlanOrigin,
  DaySlot,
  Flashcard,
  KnowledgeNode,
  Mode,
  Overrides,
  PlannerSettings,
  Resource,
  ResourceKind,
  ResourceStatus,
  Subject,
  Theme,
  TrashEdge,
  TrashEntry,
  Week,
  Weekday,
} from '../types/schema'
import { DEFAULT_PLANNER, PROMPT_TEMPLATE_MAX_CHARS, TRASH_LIMIT } from '../types/schema'
import { createSeedData } from '../data/seedData'
import { activeWeek } from '../engine/gating'
import { isNodeOpen } from '../engine/gating'
import { explicitReview, fireCredit, emptySrs } from '../engine/fire'
import { addRepairFlag, clearFlagsFrom, clearRepairFlag, recordKpFailure, resetNodeFailures } from '../engine/remediation'
import { gradeCard } from '../engine/srs'
import type { Grade } from '../engine/srs'
import { recordAttempt } from '../engine/mastery'
import { estimateForMinutes } from '../engine/estimates'
import { seedBook } from '../data/seedHelpers'
import { uniqueId } from '../lib/utils'
import { isPaused, startOfLocalDay } from '../lib/courseClock'
import { dateKey } from '../lib/dates'
import { savePersisted, mirrorNow } from '../services/storage'
import { refreshSeedContent } from '../services/seedUpgrade'
import { setSaveState } from '../services/saveStatus'
import {
  popRedo,
  popUndo,
  recordHistory,
  snapshotOf,
  snapshotsEqual,
} from '../services/history'

export interface ActionResult {
  ok: boolean
  message: string
  credits?: number
}

interface AppStore extends AppData {
  hydrated: boolean
  bootIssue?: 'corrupt' | null
  setActiveSubject: (id: string) => void
  addSubject: (input: {
    name: string
    shortName: string
    tagline: string
    accent: Subject['accent']
  }) => ActionResult
  setMode: (mode: Mode) => void
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  /** Stamp Day 1 and start the course clock. */
  startCourse: () => ActionResult
  /** Reset the clock to today without deleting any progress. */
  restartCourse: () => ActionResult
  pauseCourse: () => ActionResult
  resumeCourse: () => ActionResult
  completeOnboarding: () => void
  setGameLayer: (on: boolean) => void
  /** Replace a week's editorial day cards, keeping their origin. */
  saveDayPlans: (weekId: string, plans: DayPlan[], origin: DayPlanOrigin) => ActionResult
  deleteDayPlans: (weekId: string) => ActionResult
  deleteSubject: (subjectId: string) => ActionResult
  restoreTrash: (entryId: string) => ActionResult
  purgeTrash: (entryId: string) => void
  emptyTrash: () => void
  toggleChecklist: (weekId: string, itemId: string) => void
  saveGate: (weekId: string, scores: Week['gate']['scores']) => ActionResult
  addWeek: (input: { phaseId: string; title: string; anchor: string }) => ActionResult
  updateWeek: (weekId: string, patch: Partial<Week>) => void
  deleteWeek: (weekId: string) => string | null
  startNode: (nodeId: string) => void
  markNodeMastered: (nodeId: string) => ActionResult
  logNodeReview: (nodeId: string) => ActionResult
  failKnowledgePoint: (nodeId: string, kpId: string) => ActionResult
  clearRepair: (prereqId: string, flagId: string) => void
  addNode: (input: {
    weekId: string
    title: string
    tags: string
    primitive: string
    concept: string
    failureMode: string
    prerequisiteIds: string[]
    encompassedNodeIds: string[]
    notes?: string
  }) => ActionResult
  updateNode: (nodeId: string, patch: Partial<KnowledgeNode>) => void
  deleteNode: (nodeId: string) => string | null
  addCard: (input: {
    front: string
    back: string
    tags: string
    source: CardSource
    weekId?: string
    nodeId?: string
  }) => ActionResult
  updateCard: (cardId: string, patch: Partial<Flashcard>) => void
  deleteCard: (cardId: string) => void
  reviewCard: (cardId: string, grade: Grade) => void
  addResource: (input: {
    title: string
    url: string
    kind: ResourceKind
    description?: string
    tags: string
    weekId?: string
  }) => ActionResult
  cycleResource: (resourceId: string) => void
  updateResource: (resourceId: string, patch: Partial<Resource>) => void
  deleteResource: (resourceId: string) => string | null
  updateBook: (bookId: string, patch: Partial<Book>) => void
  addBook: (input: {
    title: string
    author: string
    url: string
    totalChapters: number
    pillar?: string
    weekFrom?: number
    weekTo?: number
  }) => void
  deleteBook: (bookId: string) => void
  toggleDailyItem: (itemId: string) => void
  unlockWeek: (weekId: string) => void
  unlockNode: (nodeId: string) => void
  clearOverride: (kind: 'week' | 'node', id: string) => void
  importData: (data: AppData, mode: 'replace' | 'merge') => void
  resetToSeed: () => void
  resetChecklistItem: (weekId: string, itemId: string) => void
  resetProgress: (scope: ResetScope, id?: string) => ActionResult
  undo: () => boolean
  redo: () => boolean
  markExported: () => void
  updatePrefs: (patch: Partial<AppData['prefs']>) => void
  updatePlanner: (patch: Partial<PlannerSettings>) => void
  savePromptOverride: (promptId: string, template: string) => void
  resetPromptOverride: (promptId: string) => void
}

export type ResetScope = 'week' | 'subject' | 'all'

const now = () => Date.now()

function activeSubjectOf(state: AppData): Subject | undefined {
  return state.subjects.find((subject) => subject.id === state.activeSubjectId) ?? state.subjects[0]
}

function patchSubject(state: AppData, updater: (subject: Subject) => Subject, timestamp: number): Partial<AppData> {
  return {
    subjects: state.subjects.map((subject) =>
      subject.id === state.activeSubjectId ? updater(subject) : subject,
    ),
    updatedAt: timestamp,
  }
}

/**
 * Day cards are keyed by week id and deliberately outlive a deletion, so a
 * restore brings them back. Only a permanent delete removes them.
 */
function plansWithout(
  dayPlans: Record<string, DayPlan[]>,
  entries: TrashEntry[],
): Record<string, DayPlan[]> {
  const weekIds = new Set<string>()
  for (const entry of entries) {
    if (entry.kind === 'week') weekIds.add((entry.payload as Week).id)
    else if (entry.kind === 'subject') {
      for (const week of (entry.payload as Subject).weeks) weekIds.add(week.id)
    }
  }
  if (weekIds.size === 0) return dayPlans
  const next = { ...dayPlans }
  for (const weekId of weekIds) delete next[weekId]
  return next
}

function makeChecklist(weekId: string, title: string): ChecklistItem[] {
  const items: Array<Omit<ChecklistItem, 'id' | 'estimate' | 'day'>> = [
    { label: `Read the docs for ${title}`, context: 'passive', done: false, minutes: 45 },
    { label: 'Sketch the idea on paper before coding', context: 'passive', done: false, minutes: 45 },
    { label: 'Build the main feature', context: 'active', tier: 'A', done: false, minutes: 60 },
    { label: 'Break it on purpose, then fix it', context: 'active', tier: 'A', done: false, minutes: 20 },
    { label: 'Test it and write what you learned', context: 'active', tier: 'B', done: false, minutes: 60 },
    { label: 'Weekly checkpoint: rebuild it without notes', context: 'active', tier: 'C', done: false, minutes: 60 },
  ]
  return items.map((item, index) => ({
    ...item,
    id: `${weekId}-c${index + 1}`,
    day: (((index % 7) + 1) as DaySlot),
    estimate: estimateForMinutes(item.minutes),
  }))
}

/** Clearing progress must never touch the curriculum text, only the evidence. */
function resetNodeProgress(node: KnowledgeNode, at: number): KnowledgeNode {
  return {
    ...node,
    status: 'locked',
    srs: emptySrs(),
    repairFlags: [],
    knowledgePoints: node.knowledgePoints.map((point) => {
      const next = { ...point, fails: 0 }
      delete next.lastFailedAt
      return next
    }),
    updatedAt: at,
  }
}

function resetCardProgress(card: Flashcard, at: number): Flashcard {
  return { ...card, scheduleStep: 0, dueAt: 0, lapses: 0, reviews: 0, updatedAt: at }
}

function clearGateProgress(week: Week): Week {
  return {
    ...week,
    checklist: week.checklist.map((item) => ({ ...item, done: false, doneAt: undefined })),
    gate: { attempts: [], notes: week.gate.notes },
  }
}

function pruneOverrides(overrides: Overrides, weekIds: Set<string>, nodeIds: Set<string>): Overrides {
  return {
    weeks: Object.fromEntries(Object.entries(overrides.weeks).filter(([key]) => !weekIds.has(key))),
    nodes: Object.fromEntries(Object.entries(overrides.nodes).filter(([key]) => !nodeIds.has(key))),
  }
}

export const useAppStore = create<AppStore>()((set, get) => ({
  ...createSeedData(),
  hydrated: false,

  setActiveSubject: (id) =>
    set((state) =>
      state.subjects.some((subject) => subject.id === id)
        ? { activeSubjectId: id, updatedAt: now() }
        : {},
    ),

  addSubject: (input) => {
    if (!input.name.trim()) return { ok: false, message: 'Give the track a name first.' }
    const at = now()
    const id = uniqueId('track')
    const phases = [
      { id: `${id}-p1`, name: 'Phase 1 · Foundations', subtitle: 'Core primitives and first-principles vocabulary' },
      { id: `${id}-p2`, name: 'Phase 2 · Application', subtitle: 'Apply the primitives in a real, constrained build' },
      { id: `${id}-p3`, name: 'Phase 3 · Systems', subtitle: 'Integrate, harden and connect the pieces' },
      { id: `${id}-p4`, name: 'Phase 4 · Mastery', subtitle: 'Ship, defend and teach the system' },
    ]
    const weekId = `${id}-w1`
    const week: Week = {
      id: weekId,
      weekNumber: 1,
      phaseId: phases[0]?.id ?? `${id}-p1`,
      title: 'Orientation & first principles',
      anchor:
        'Define what mastery means for this subject: the core primitive, the proof of understanding, and the failure mode that would reveal a shallow model.',
      outcomes: [
        'Write the first-principles anchor for this track',
        'Choose a real artifact you will build by Week 4',
        'Define the blind-gate challenge you will have to pass',
      ],
      rabbitHoles: ['Tools, frameworks and optimisations that are not on the critical path yet'],
      bookFocus: 'Choose one timeless book and assign 30 minutes per day',
      prerequisiteWeekIds: [],
      encompassedNodeIds: [],
      checklist: makeChecklist(weekId, 'Orientation & first principles'),
      gate: { attempts: [], notes: 'Design a 60-minute, closed-book challenge that proves the core primitive without notes or AI.' },
      detail: 'compact',
    }
    const subject: Subject = {
      id,
      name: input.name.trim(),
      shortName: input.shortName.trim() || input.name.trim().split(/\s+/)[0] || 'Track',
      tagline: input.tagline.trim(),
      accent: input.accent,
      phases,
      weeks: [week],
      nodes: [],
      cards: [],
      resources: [],
    }
    set({
      subjects: [...get().subjects, subject],
      activeSubjectId: id,
      updatedAt: at,
    })
    return { ok: true, message: `${subject.shortName} track created with a starter week.` }
  },

  setMode: (mode) => set((state) => ({ prefs: { ...state.prefs, mode }, updatedAt: now() })),

  setTheme: (theme) => set((state) => ({ prefs: { ...state.prefs, theme }, updatedAt: now() })),

  toggleSidebar: () =>
    set((state) => ({
      prefs: { ...state.prefs, sidebarCollapsed: !state.prefs.sidebarCollapsed },
    })),

  startCourse: () => {
    const state = get()
    if (state.journey.startedAt !== null) {
      return { ok: false, message: 'The course is already running. Use restart if you need to.' }
    }
    const startedAt = startOfLocalDay(now())
    set({
      journey: {
        ...state.journey,
        startedAt,
        startWeekday: new Date(startedAt).getDay() as Weekday,
        pauses: [],
      },
      updatedAt: now(),
    })
    return { ok: true, message: 'Day 1 begins today. The clock is running.' }
  },

  restartCourse: () => {
    const startedAt = startOfLocalDay(now())
    set((state) => ({
      journey: {
        ...state.journey,
        startedAt,
        startWeekday: new Date(startedAt).getDay() as Weekday,
        pauses: [],
      },
      updatedAt: now(),
    }))
    return { ok: true, message: 'The clock starts again today. Your progress is untouched.' }
  },

  pauseCourse: () => {
    const state = get()
    if (state.journey.startedAt === null) {
      return { ok: false, message: 'The course has not started yet.' }
    }
    if (isPaused(state.journey)) {
      return { ok: false, message: 'The course is already paused.' }
    }
    const at = now()
    set({
      journey: { ...state.journey, pauses: [...state.journey.pauses, { from: at, to: null }] },
      updatedAt: at,
    })
    return { ok: true, message: 'Paused. The course day will wait for you.' }
  },

  resumeCourse: () => {
    const state = get()
    const open = state.journey.pauses.some((pause) => pause.to === null)
    if (!open) return { ok: false, message: 'The course is not paused.' }
    const at = now()
    const pauses = state.journey.pauses.map((pause) =>
      pause.to === null ? { ...pause, to: at } : pause,
    )
    set({ journey: { ...state.journey, pauses }, updatedAt: at })
    return { ok: true, message: 'Back on. The clock picks up where it stopped.' }
  },

  completeOnboarding: () => set((state) => ({ journey: { ...state.journey, onboardedAt: now() }, updatedAt: now() })),

  setGameLayer: (on) =>
    set((state) => ({ journey: { ...state.journey, gameLayer: on }, updatedAt: now() })),

  saveDayPlans: (weekId, plans, origin) => {
    const state = get()
    const subject = activeSubjectOf(state)
    if (!subject) return { ok: false, message: 'No active subject.' }
    if (!subject.weeks.some((week) => week.id === weekId)) {
      return { ok: false, message: 'That week no longer exists.' }
    }
    const clean = plans
      .filter((plan) => plan.day >= 1 && plan.day <= 7)
      .map((plan) => ({ ...plan, origin }))
      .sort((a, b) => a.day - b.day)
    if (clean.length !== 7) {
      return { ok: false, message: `A week needs seven day cards. This draft has ${clean.length}.` }
    }
    if (new Set(clean.map((plan) => plan.day)).size !== 7) {
      return { ok: false, message: 'Two day cards claim the same day.' }
    }
    set({ dayPlans: { ...state.dayPlans, [weekId]: clean }, updatedAt: now() })
    return { ok: true, message: 'Seven day cards saved.' }
  },

  deleteDayPlans: (weekId) => {
    const state = get()
    const plans = state.dayPlans[weekId]
    if (!plans || plans.length === 0) return { ok: false, message: 'That week has no day cards.' }
    const subject = activeSubjectOf(state)
    const week = subject?.weeks.find((entry) => entry.id === weekId)
    const entry: TrashEntry = {
      id: uniqueId('trash'),
      kind: 'dayPlans',
      deletedAt: now(),
      label: week ? `${week.title} day cards` : 'Day cards',
      // For this kind the subjectId field carries the week id.
      subjectId: weekId,
      subjectName: subject?.shortName ?? '',
      payload: plans,
      counts: { days: plans.length },
    }
    const dayPlans = { ...state.dayPlans }
    delete dayPlans[weekId]
    set({
      dayPlans,
      trash: [entry, ...state.trash].slice(0, TRASH_LIMIT),
      updatedAt: now(),
    })
    return { ok: true, message: 'Day cards moved to trash.' }
  },

  deleteSubject: (subjectId) => {
    const state = get()
    if (state.subjects.length <= 1) {
      return { ok: false, message: 'That is the only track left. Reset it instead.' }
    }
    const subject = state.subjects.find((entry) => entry.id === subjectId)
    if (!subject) return { ok: false, message: 'That track no longer exists.' }
    const entry: TrashEntry = {
      id: uniqueId('trash'),
      kind: 'subject',
      deletedAt: now(),
      label: subject.name,
      subjectId: subject.id,
      subjectName: subject.shortName,
      payload: subject,
      counts: {
        weeks: subject.weeks.length,
        nodes: subject.nodes.length,
        cards: subject.cards.length,
      },
    }
    // Day cards stay keyed by week id, so restoring the track restores them
    // with it. They are simply unreachable while the track is gone.
    const subjects = state.subjects.filter((entry2) => entry2.id !== subjectId)
    set({
      subjects,
      activeSubjectId: state.activeSubjectId === subjectId ? subjects[0]!.id : state.activeSubjectId,
      trash: [entry, ...state.trash].slice(0, TRASH_LIMIT),
      updatedAt: now(),
    })
    return { ok: true, message: `“${subject.shortName}” moved to trash.` }
  },

  restoreTrash: (entryId) => {
    const state = get()
    const entry = state.trash.find((candidate) => candidate.id === entryId)
    if (!entry) return { ok: false, message: 'That item is no longer in the trash.' }

    if (entry.kind === 'week') {
      const week = entry.payload as Week
      const subject = state.subjects.find((candidate) => candidate.id === entry.subjectId)
      if (!subject) return { ok: false, message: 'The track that owned that week is gone.' }
      if (subject.weeks.some((candidate) => candidate.id === week.id)) {
        return { ok: false, message: 'That week is already back.' }
      }
      const nodeIds = new Set((entry.nodes ?? []).map((node) => node.id))
      const knownNodes = new Set(subject.nodes.map((node) => node.id))
      const knownCards = new Set(subject.cards.map((card) => card.id))
      const dependedOnIt = new Set(entry.weekLinks ?? [])
      const pruned = new Map((entry.edges ?? []).map((edge) => [edge.nodeId, edge]))

      const weeks = [...subject.weeks, week]
        .sort((a, b) => a.weekNumber - b.weekNumber)
        .map((candidate) =>
          dependedOnIt.has(candidate.id) && !candidate.prerequisiteWeekIds.includes(week.id)
            ? { ...candidate, prerequisiteWeekIds: [...candidate.prerequisiteWeekIds, week.id] }
            : candidate,
        )
      const nodes = [...subject.nodes, ...(entry.nodes ?? []).filter((node) => !knownNodes.has(node.id))].map(
        (node) => {
          const edge = pruned.get(node.id)
          if (!edge) return node
          return {
            ...node,
            prerequisiteIds: [
              ...new Set([...node.prerequisiteIds, ...edge.prerequisiteIds.filter((id) => nodeIds.has(id))]),
            ],
            encompassedNodeIds: [
              ...new Set([
                ...node.encompassedNodeIds,
                ...edge.encompassedNodeIds.filter((id) => nodeIds.has(id)),
              ]),
            ],
          }
        },
      )
      const cards = [
        ...subject.cards,
        ...(entry.cards ?? []).filter((card) => !knownCards.has(card.id)),
      ]

      set({
        subjects: state.subjects.map((candidate) =>
          candidate.id === subject.id ? { ...candidate, weeks, nodes, cards } : candidate,
        ),
        trash: state.trash.filter((candidate) => candidate.id !== entryId),
        updatedAt: now(),
      })
      return { ok: true, message: `“${entry.label}” restored.` }
    }

    if (entry.kind === 'subject') {
      const subject = entry.payload as Subject
      if (state.subjects.some((candidate) => candidate.id === subject.id)) {
        return { ok: false, message: 'That track is already back.' }
      }
      set({
        subjects: [...state.subjects, subject],
        trash: state.trash.filter((candidate) => candidate.id !== entryId),
        updatedAt: now(),
      })
      return { ok: true, message: `"${entry.label}" restored.` }
    }

    if (entry.kind === 'node') {
      const node = entry.payload as KnowledgeNode
      const subject = state.subjects.find((candidate) => candidate.id === entry.subjectId)
      if (!subject) return { ok: false, message: 'The track that owned that node is gone.' }
      if (subject.nodes.some((candidate) => candidate.id === node.id)) {
        return { ok: false, message: 'That node is already back.' }
      }
      const knownCards = new Set(subject.cards.map((card) => card.id))
      const cards = [
        ...subject.cards,
        ...(entry.cards ?? []).filter((card) => !knownCards.has(card.id)),
      ]
      const inbound = new Map((entry.edges ?? []).map((edge) => [edge.nodeId, edge]))
      const nodes = [...subject.nodes, node].map((candidate) => {
        const edge = inbound.get(candidate.id)
        if (!edge) return candidate
        return {
          ...candidate,
          prerequisiteIds: Array.from(new Set([...candidate.prerequisiteIds, ...edge.prerequisiteIds])),
          encompassedNodeIds: Array.from(new Set([...candidate.encompassedNodeIds, ...edge.encompassedNodeIds])),
        }
      })
      set({
        subjects: state.subjects.map((candidate) =>
          candidate.id === subject.id ? { ...candidate, nodes, cards } : candidate,
        ),
        trash: state.trash.filter((candidate) => candidate.id !== entryId),
        updatedAt: now(),
      })
      return { ok: true, message: `"${entry.label}" restored.` }
    }

    if (entry.kind === 'resource') {
      const resource = entry.payload as Resource
      const subject = state.subjects.find((candidate) => candidate.id === entry.subjectId)
      if (!subject) return { ok: false, message: 'The track that owned that resource is gone.' }
      if (subject.resources.some((candidate) => candidate.id === resource.id)) {
        return { ok: false, message: 'That resource is already back.' }
      }
      set({
        subjects: state.subjects.map((candidate) =>
          candidate.id === subject.id
            ? { ...candidate, resources: [...candidate.resources, resource] }
            : candidate,
        ),
        trash: state.trash.filter((candidate) => candidate.id !== entryId),
        updatedAt: now(),
      })
      return { ok: true, message: `"${entry.label}" restored.` }
    }

    const weekId = entry.subjectId
    if (state.dayPlans[weekId]) {
      return { ok: false, message: 'That week already has day cards.' }
    }
    set({
      dayPlans: { ...state.dayPlans, [weekId]: entry.payload as DayPlan[] },
      trash: state.trash.filter((candidate) => candidate.id !== entryId),
      updatedAt: now(),
    })
    return { ok: true, message: `“${entry.label}” restored.` }
  },

  purgeTrash: (entryId) =>
    set((state) => {
      const entry = state.trash.find((candidate) => candidate.id === entryId)
      if (!entry) return {}
      // A purged week is never coming back, so a card that pointed at one of
      // its nodes loses the link now instead of keeping a dangling id.
      const removedNodes = new Set((entry.nodes ?? []).map((node) => node.id))
      const subjects =
        entry.kind === 'week' && removedNodes.size > 0
          ? state.subjects.map((subject) =>
              subject.id === entry.subjectId
                ? {
                    ...subject,
                    cards: subject.cards.map((card) =>
                      card.nodeId && removedNodes.has(card.nodeId)
                        ? { ...card, nodeId: undefined }
                        : card,
                    ),
                  }
                : subject,
            )
          : state.subjects
      return {
        trash: state.trash.filter((candidate) => candidate.id !== entryId),
        dayPlans: plansWithout(state.dayPlans, [entry]),
        subjects,
        updatedAt: now(),
      }
    }),

  emptyTrash: () =>
    set((state) => ({
      trash: [],
      dayPlans: plansWithout(state.dayPlans, state.trash),
      updatedAt: now(),
    })),

  toggleChecklist: (weekId, itemId) =>
    set((state) => {
      const at = now()
      return patchSubject(
        state,
        (subject) => ({
          ...subject,
          weeks: subject.weeks.map((week) =>
            week.id === weekId
              ? {
                  ...week,
                  checklist: week.checklist.map((item) =>
                    item.id === itemId
                      ? item.done
                        ? { ...item, done: false, doneAt: undefined }
                        : { ...item, done: true, doneAt: at }
                      : item,
                  ),
                }
              : week,
          ),
        }),
        at,
      )
    }),

  saveGate: (weekId, scores) => {
    if (!scores) return { ok: false, message: 'Set all four scores first.' }
    const state = get()
    const subject = activeSubjectOf(state)
    const week = subject?.weeks.find((entry) => entry.id === weekId)
    if (!subject || !week) return { ok: false, message: 'Week not found.' }
    const at = now()
    const wasPassed = Boolean(week.gate.passedAt)
    const gate = recordAttempt(week.gate, scores, at)
    const justPassed = !wasPassed && Boolean(gate.passedAt)
    let credits = 0
    const nodes = subject.nodes.map((node) => {
      if (!justPassed || !week.encompassedNodeIds.includes(node.id)) return node
      const credited = fireCredit(node.srs, at)
      if (credited.credited) credits++
      return { ...node, srs: credited.srs, updatedAt: at }
    })
    set({
      ...patchSubject(
        state,
        (current) => ({
          ...current,
          weeks: current.weeks.map((entry) => (entry.id === weekId ? { ...entry, gate } : entry)),
          nodes,
        }),
        at,
      ),
    })
    return {
      ok: true,
      credits,
      message: gate.passedAt
        ? justPassed
          ? `Gate cleared. Week ${week.weekNumber + 1} unlocked.`
          : 'Gate already cleared — attempt saved.'
        : 'Attempt saved. Gate not cleared yet.',
    }
  },

  addWeek: (input) => {
    const state = get()
    const subject = activeSubjectOf(state)
    if (!subject) return { ok: false, message: 'No active subject.' }
    const at = now()
    const number = Math.max(0, ...subject.weeks.map((week) => week.weekNumber)) + 1
    const id = uniqueId('week')
    const week: Week = {
      id,
      weekNumber: number,
      phaseId: input.phaseId,
      title: input.title || `Week ${number}`,
      anchor: input.anchor || 'Define the first-principles anchor for this week.',
      outcomes: [],
      rabbitHoles: [],
      bookFocus: '',
      prerequisiteWeekIds: [],
      encompassedNodeIds: [],
      checklist: makeChecklist(id, input.title || `Week ${number}`),
      gate: { attempts: [] },
      detail: 'compact',
    }
    set({
      ...patchSubject(
        state,
        (current) => ({ ...current, weeks: [...current.weeks, week] }),
        at,
      ),
    })
    return { ok: true, message: `Week ${number} added.` }
  },

  updateWeek: (weekId, patch) =>
    set((state) =>
      patchSubject(
        state,
        (subject) => ({
          ...subject,
          weeks: subject.weeks.map((week) => (week.id === weekId ? { ...week, ...patch } : week)),
        }),
        now(),
      ),
    ),

  deleteWeek: (weekId) => {
    const state = get()
    const subject = activeSubjectOf(state)
    const week = subject?.weeks.find((entry) => entry.id === weekId)
    if (!subject || !week) return null
    const removedNodeIds = new Set(
      subject.nodes.filter((node) => node.weekId === weekId).map((node) => node.id),
    )
    const entry: TrashEntry = {
      id: uniqueId('trash'),
      kind: 'week',
      deletedAt: now(),
      label: `Week ${week.weekNumber}: ${week.title}`,
      subjectId: subject.id,
      subjectName: subject.shortName,
      payload: week,
      nodes: subject.nodes.filter((node) => node.weekId === weekId),
      cards: subject.cards.filter((card) => card.weekId === weekId),
      // Record the graph edges this delete is about to prune, so a restore puts
      // them back instead of leaving a silently thinner prerequisite graph.
      edges: subject.nodes
        .filter((node) => node.weekId !== weekId)
        .map((node) => ({
          nodeId: node.id,
          prerequisiteIds: node.prerequisiteIds.filter((id) => removedNodeIds.has(id)),
          encompassedNodeIds: node.encompassedNodeIds.filter((id) => removedNodeIds.has(id)),
        }))
        .filter((edge) => edge.prerequisiteIds.length > 0 || edge.encompassedNodeIds.length > 0),
      weekLinks: subject.weeks
        .filter((candidate) => candidate.id !== weekId && candidate.prerequisiteWeekIds.includes(weekId))
        .map((candidate) => candidate.id),
      counts: {
        nodes: removedNodeIds.size,
        cards: subject.cards.filter((card) => card.weekId === weekId).length,
        days: state.dayPlans[weekId]?.length ?? 0,
      },
    }
    set((current) => ({
      ...patchSubject(
        current,
        (active) => ({
          ...active,
          weeks: active.weeks
            .filter((candidate) => candidate.id !== weekId)
            .map((candidate) => ({
              ...candidate,
              prerequisiteWeekIds: candidate.prerequisiteWeekIds.filter((id) => id !== weekId),
            })),
          nodes: active.nodes
            .filter((node) => node.weekId !== weekId)
            .map((node) => ({
              ...node,
              prerequisiteIds: node.prerequisiteIds.filter((id) => !removedNodeIds.has(id)),
              encompassedNodeIds: node.encompassedNodeIds.filter((id) => !removedNodeIds.has(id)),
            })),
          cards: active.cards.filter((card) => card.weekId !== weekId),
        }),
        now(),
      ),
      // Day cards stay keyed by week id so a restore brings them back with it.
      trash: [entry, ...current.trash].slice(0, TRASH_LIMIT),
    }))
    return entry.id
  },

  startNode: (nodeId) =>
    set((state) => {
      const at = now()
      return patchSubject(
        state,
        (subject) => ({
          ...subject,
          nodes: subject.nodes.map((node) =>
            node.id === nodeId && node.status === 'locked' ? { ...node, status: 'learning', updatedAt: at } : node,
          ),
        }),
        at,
      )
    }),

  markNodeMastered: (nodeId) => {
    const state = get()
    const subject = activeSubjectOf(state)
    const node = subject?.nodes.find((entry) => entry.id === nodeId)
    if (!subject || !node) return { ok: false, message: 'Node not found.' }
    if (!isNodeOpen(node, subject, state.overrides)) {
      return { ok: false, message: 'Prerequisites are not mastered. Unlock it first if you mean to override.' }
    }
    const at = now()
    let credits = 0
    let nodes = subject.nodes.map((entry) => {
      if (entry.id === nodeId) {
        const clearedFlags = entry.repairFlags.map((flag) =>
          flag.clearedAt ? flag : { ...flag, clearedAt: at },
        )
        return {
          ...entry,
          status: 'mastered' as const,
          repairFlags: clearedFlags,
          knowledgePoints: resetNodeFailures(entry).knowledgePoints,
          srs: explicitReview(entry.srs, at),
          updatedAt: at,
        }
      }
      if (entry.repairFlags.some((flag) => flag.fromNodeId === nodeId && !flag.clearedAt)) {
        return clearFlagsFrom(entry, nodeId, at)
      }
      return entry
    })
    nodes = nodes.map((entry) => {
      if (!node.encompassedNodeIds.includes(entry.id)) return entry
      const credited = fireCredit(entry.srs, at)
      if (credited.credited) credits++
      return { ...entry, srs: credited.srs, updatedAt: at }
    })
    set({ ...patchSubject(state, (current) => ({ ...current, nodes }), at) })
    return {
      ok: true,
      credits,
      message: credits
        ? `${node.title} mastered · FIRe credited ${credits} encompassed node${credits === 1 ? '' : 's'}.`
        : `${node.title} mastered.`,
    }
  },

  logNodeReview: (nodeId) => {
    const state = get()
    const subject = activeSubjectOf(state)
    const node = subject?.nodes.find((entry) => entry.id === nodeId)
    if (!subject || !node) return { ok: false, message: 'Node not found.' }
    const at = now()
    let credits = 0
    const nodes = subject.nodes.map((entry) => {
      if (entry.id === nodeId) {
        return { ...entry, srs: explicitReview(entry.srs, at), updatedAt: at }
      }
      if (!node.encompassedNodeIds.includes(entry.id)) return entry
      const credited = fireCredit(entry.srs, at)
      if (credited.credited) credits++
      return { ...entry, srs: credited.srs, updatedAt: at }
    })
    set({ ...patchSubject(state, (current) => ({ ...current, nodes }), at) })
    return {
      ok: true,
      credits,
      message: credits
        ? `Review logged · FIRe extended ${credits} encompassed node${credits === 1 ? '' : 's'}.`
        : 'Review logged.',
    }
  },

  failKnowledgePoint: (nodeId, kpId) => {
    const state = get()
    const subject = activeSubjectOf(state)
    const node = subject?.nodes.find((entry) => entry.id === nodeId)
    if (!subject || !node) return { ok: false, message: 'Node not found.' }
    const at = now()
    const failed = recordKpFailure(node, kpId, at)
    const kp = failed.knowledgePoints.find((entry) => entry.id === kpId)
    const shouldFlag = (kp?.fails ?? 0) >= 2
    let flagged = 0
    const nodes = subject.nodes.map((entry) => {
      if (entry.id === nodeId) return failed
      if (!shouldFlag || !node.prerequisiteIds.includes(entry.id)) return entry
      const updated = addRepairFlag(entry, nodeId, kpId, at)
      if (updated !== entry) flagged++
      return updated
    })
    set({ ...patchSubject(state, (current) => ({ ...current, nodes }), at) })
    return {
      ok: true,
      credits: flagged,
      message: shouldFlag
        ? flagged
          ? `Second failure logged. ${flagged} prerequisite${flagged === 1 ? '' : 's'} flagged for a 30-min repair drill.`
          : 'Second failure logged. This node needs repair before advancing.'
        : `Failure logged (${kp?.fails ?? 1}/2). One more and its prerequisites get flagged.`,
    }
  },

  clearRepair: (prereqId, flagId) =>
    set((state) => {
      const at = now()
      return patchSubject(
        state,
        (subject) => ({
          ...subject,
          nodes: subject.nodes.map((node) => {
            if (node.id !== prereqId) return node
            const cleared = clearRepairFlag(node, flagId, at)
            return { ...cleared, srs: explicitReview(node.srs, at) }
          }),
        }),
        at,
      )
    }),

  addNode: (input) => {
    const state = get()
    const subject = activeSubjectOf(state)
    if (!subject) return { ok: false, message: 'No active subject.' }
    if (!input.title.trim()) return { ok: false, message: 'A title is required.' }
    const at = now()
    const id = uniqueId('node')
    const node: KnowledgeNode = {
      id,
      weekId: input.weekId,
      title: input.title.trim(),
      slug: input.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      tags: input.tags
        .split(/[,\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      prerequisiteIds: input.prerequisiteIds,
      encompassedNodeIds: input.encompassedNodeIds,
      knowledgePoints: [
        {
          id: `${id}-kp1`,
          primitive: input.primitive,
          concept: input.concept,
          failureMode: input.failureMode,
          fails: 0,
        },
      ],
      status: 'locked',
      srs: emptySrs(),
      repairFlags: [],
      notes: input.notes?.trim() || undefined,
      createdAt: at,
      updatedAt: at,
    }
    set({ ...patchSubject(state, (current) => ({ ...current, nodes: [...current.nodes, node] }), at) })
    return { ok: true, message: `Node “${node.title}” added.` }
  },

  updateNode: (nodeId, patch) =>
    set((state) =>
      patchSubject(
        state,
        (subject) => ({
          ...subject,
          nodes: subject.nodes.map((node) =>
            node.id === nodeId ? { ...node, ...patch, updatedAt: now() } : node,
          ),
        }),
        now(),
      ),
    ),

  deleteNode: (nodeId) => {
    const state = get()
    const subject = activeSubjectOf(state)
    if (!subject) return null
    const node = subject.nodes.find((entry) => entry.id === nodeId)
    if (!node) return null
    const removedCards = subject.cards.filter((card) => card.nodeId === nodeId)
    const inboundEdges: TrashEdge[] = subject.nodes
      .filter((n) => n.id !== nodeId && (n.prerequisiteIds.includes(nodeId) || n.encompassedNodeIds.includes(nodeId)))
      .map((n) => ({
        nodeId: n.id,
        prerequisiteIds: n.prerequisiteIds,
        encompassedNodeIds: n.encompassedNodeIds,
      }))
    const entry: TrashEntry = {
      id: uniqueId('trash'),
      kind: 'node',
      deletedAt: now(),
      label: node.title,
      subjectId: subject.id,
      subjectName: subject.shortName,
      payload: node,
      cards: removedCards,
      edges: inboundEdges,
      counts: {
        nodes: 1,
        cards: removedCards.length,
      },
    }
    set((current) => ({
      ...patchSubject(
        current,
        (subj) => ({
          ...subj,
          nodes: subj.nodes
            .filter((n) => n.id !== nodeId)
            .map((n) => ({
              ...n,
              prerequisiteIds: n.prerequisiteIds.filter((id) => id !== nodeId),
              encompassedNodeIds: n.encompassedNodeIds.filter((id) => id !== nodeId),
            })),
          cards: subj.cards.map((card) => (card.nodeId === nodeId ? { ...card, nodeId: undefined } : card)),
        }),
        now(),
      ),
      trash: [entry, ...current.trash].slice(0, TRASH_LIMIT),
    }))
    return entry.id
  },

  addCard: (input) => {
    const state = get()
    const subject = activeSubjectOf(state)
    if (!subject) return { ok: false, message: 'No active subject.' }
    if (!input.front.trim() || !input.back.trim()) return { ok: false, message: 'Front and back are both required.' }
    const at = now()
    const card: Flashcard = {
      id: uniqueId('card'),
      weekId: input.weekId || undefined,
      nodeId: input.nodeId || undefined,
      front: input.front.trim(),
      back: input.back.trim(),
      tags: input.tags
        .split(/[,\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      source: input.source,
      scheduleStep: 0,
      dueAt: at,
      lapses: 0,
      reviews: 0,
      createdAt: at,
      updatedAt: at,
    }
    set({ ...patchSubject(state, (current) => ({ ...current, cards: [card, ...current.cards] }), at) })
    return { ok: true, message: 'Flashcard added to the deck.' }
  },

  updateCard: (cardId, patch) =>
    set((state) =>
      patchSubject(
        state,
        (subject) => ({
          ...subject,
          cards: subject.cards.map((card) =>
            card.id === cardId ? { ...card, ...patch, updatedAt: now() } : card,
          ),
        }),
        now(),
      ),
    ),

  deleteCard: (cardId) =>
    set((state) =>
      patchSubject(
        state,
        (subject) => ({ ...subject, cards: subject.cards.filter((card) => card.id !== cardId) }),
        now(),
      ),
    ),

  reviewCard: (cardId, grade) =>
    set((state) =>
      patchSubject(
        state,
        (subject) => ({
          ...subject,
          cards: subject.cards.map((card) =>
            card.id === cardId ? gradeCard(card, grade, now()) : card,
          ),
        }),
        now(),
      ),
    ),

  addResource: (input) => {
    const state = get()
    const subject = activeSubjectOf(state)
    if (!subject) return { ok: false, message: 'No active subject.' }
    try {
      const parsed = new URL(input.url)
      if (!/^https?:$/.test(parsed.protocol)) throw new Error('bad protocol')
    } catch {
      return { ok: false, message: 'Enter a full https:// URL.' }
    }
    const resource: Resource = {
      id: uniqueId('res'),
      title: input.title.trim() || input.url,
      url: input.url.trim(),
      kind: input.kind,
      description: input.description?.trim() || undefined,
      tags: input.tags
        .split(/[,\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: 'toRead',
      weekId: input.weekId || undefined,
    }
    set({
      ...patchSubject(state, (current) => ({ ...current, resources: [resource, ...current.resources] }), now()),
    })
    return { ok: true, message: 'Resource added to the vault.' }
  },

  cycleResource: (resourceId) =>
    set((state) =>
      patchSubject(
        state,
        (subject) => ({
          ...subject,
          resources: subject.resources.map((resource) => {
            if (resource.id !== resourceId) return resource
            const order: ResourceStatus[] = ['toRead', 'reading', 'done']
            const next = order[(order.indexOf(resource.status) + 1) % order.length] ?? 'toRead'
            return { ...resource, status: next }
          }),
        }),
        now(),
      ),
    ),

  updateResource: (resourceId, patch) =>
    set((state) =>
      patchSubject(
        state,
        (subject) => ({
          ...subject,
          resources: subject.resources.map((resource) =>
            resource.id === resourceId ? { ...resource, ...patch } : resource,
          ),
        }),
        now(),
      ),
    ),

  deleteResource: (resourceId) => {
    const state = get()
    const subject = activeSubjectOf(state)
    if (!subject) return null
    const resource = subject.resources.find((entry) => entry.id === resourceId)
    if (!resource) return null
    const entry: TrashEntry = {
      id: uniqueId('trash'),
      kind: 'resource',
      deletedAt: now(),
      label: resource.title,
      subjectId: subject.id,
      subjectName: subject.shortName,
      payload: resource,
      counts: {
        resources: 1,
      },
    }
    set((current) => ({
      ...patchSubject(
        current,
        (subj) => ({
          ...subj,
          resources: subj.resources.filter((r) => r.id !== resourceId),
        }),
        now(),
      ),
      trash: [entry, ...current.trash].slice(0, TRASH_LIMIT),
    }))
    return entry.id
  },

  updateBook: (bookId, patch) =>
    set((state) => ({
      books: state.books.map((book) => (book.id === bookId ? { ...book, ...patch } : book)),
      updatedAt: now(),
    })),

  addBook: (input) =>
    set((state) => ({
      books: [
        ...state.books,
        seedBook({
          id: uniqueId('book'),
          title: input.title,
          author: input.author,
          pillar: input.pillar,
          url: input.url,
          totalChapters: input.totalChapters,
          weekFrom: input.weekFrom ?? 1,
          weekTo: input.weekTo ?? 24,
        }),
      ],
      updatedAt: now(),
    })),

  deleteBook: (bookId) =>
    set((state) => ({
      books: state.books.filter((book) => book.id !== bookId),
      updatedAt: now(),
    })),

  toggleDailyItem: (itemId) =>
    set((state) => {
      const key = dateKey()
      const existing = state.dailyLog[key]?.items ?? []
      const items = existing.includes(itemId)
        ? existing.filter((id) => id !== itemId)
        : [...existing, itemId]
      return {
        dailyLog: { ...state.dailyLog, [key]: { items } },
        updatedAt: now(),
      }
    }),

  unlockWeek: (weekId) =>
    set((state) => ({
      overrides: { ...state.overrides, weeks: { ...state.overrides.weeks, [weekId]: now() } },
      updatedAt: now(),
    })),

  unlockNode: (nodeId) =>
    set((state) => ({
      overrides: { ...state.overrides, nodes: { ...state.overrides.nodes, [nodeId]: now() } },
      updatedAt: now(),
    })),

  clearOverride: (kind, id) =>
    set((state) => {
      const overrides = {
        weeks: { ...state.overrides.weeks },
        nodes: { ...state.overrides.nodes },
      }
      delete overrides[kind === 'week' ? 'weeks' : 'nodes'][id]
      return { overrides, updatedAt: now() }
    }),

  importData: (incoming, mode) => {
    const state = get()
    if (mode === 'replace') {
      const { data: refreshed } = refreshSeedContent(incoming)
      set({
        ...refreshed,
        hydrated: true,
        activeSubjectId: refreshed.subjects.some((subject) => subject.id === state.activeSubjectId)
          ? state.activeSubjectId
          : refreshed.activeSubjectId,
        prefs: { ...refreshed.prefs, theme: state.prefs.theme },
        // Capacity belongs to this device, not to the imported file.
        planner: { ...state.planner, studyDays: [...state.planner.studyDays] },
      })
      return
    }
    const subjects = [...state.subjects]
    for (const incomingSubject of incoming.subjects) {
      const index = subjects.findIndex((subject) => subject.id === incomingSubject.id)
      if (index >= 0) subjects[index] = incomingSubject
      else subjects.push(incomingSubject)
    }
    const dailyLog = { ...state.dailyLog }
    for (const [key, value] of Object.entries(incoming.dailyLog)) {
      const currentItems = dailyLog[key]?.items ?? []
      dailyLog[key] = { items: Array.from(new Set([...currentItems, ...value.items])) }
    }
    const books = state.books.map((book) => {
      const incomingBook = incoming.books.find((entry) => entry.id === book.id)
      if (!incomingBook) return book
      return incomingBook.currentChapter > book.currentChapter ? incomingBook : book
    })
    for (const book of incoming.books) {
      if (!books.some((entry) => entry.id === book.id)) books.push(book)
    }
    set({
      subjects,
      books,
      dailyLog,
      overrides: {
        weeks: { ...incoming.overrides.weeks, ...state.overrides.weeks },
        nodes: { ...incoming.overrides.nodes, ...state.overrides.nodes },
      },
      // Local prompt edits win a merge; an incoming file only fills gaps.
      promptOverrides: { ...incoming.promptOverrides, ...state.promptOverrides },
      seedVersion: Math.max(state.seedVersion, incoming.seedVersion),
      updatedAt: now(),
    })
  },

  resetToSeed: () => {
    const state = get()
    const seed = createSeedData()
    set({
      ...seed,
      prefs: { ...seed.prefs, theme: state.prefs.theme, mode: state.prefs.mode },
      planner: { ...state.planner, studyDays: [...state.planner.studyDays] },
      hydrated: true,
    })
  },

  resetChecklistItem: (weekId, itemId) =>
    set((state) => {
      const at = now()
      return patchSubject(
        state,
        (subject) => ({
          ...subject,
          weeks: subject.weeks.map((week) =>
            week.id === weekId
              ? {
                  ...week,
                  checklist: week.checklist.map((item) =>
                    item.id === itemId ? { ...item, done: false, doneAt: undefined } : item,
                  ),
                }
              : week,
          ),
        }),
        at,
      )
    }),

  resetProgress: (scope, id) => {
    const state = get()
    const at = now()

    if (scope === 'week') {
      if (!id) return { ok: false, message: 'Choose a week to reset.' }
      const subject = activeSubjectOf(state)
      const week = subject?.weeks.find((entry) => entry.id === id)
      if (!subject || !week) return { ok: false, message: 'Week not found.' }
      const nodeIds = new Set(subject.nodes.filter((node) => node.weekId === id).map((node) => node.id))
      set({
        ...patchSubject(
          state,
          (current) => ({
            ...current,
            weeks: current.weeks.map((entry) => (entry.id === id ? clearGateProgress(entry) : entry)),
            nodes: current.nodes.map((node) => (nodeIds.has(node.id) ? resetNodeProgress(node, at) : node)),
            cards: current.cards.map((card) => (card.weekId === id ? resetCardProgress(card, at) : card)),
          }),
          at,
        ),
        overrides: pruneOverrides(state.overrides, new Set([id]), nodeIds),
      })
      return {
        ok: true,
        message: `Week ${week.weekNumber} progress cleared. Content is untouched, and Undo restores it.`,
      }
    }

    if (scope === 'subject') {
      const subject = activeSubjectOf(state)
      if (!subject) return { ok: false, message: 'No active subject.' }
      const weekIds = new Set(subject.weeks.map((week) => week.id))
      const nodeIds = new Set(subject.nodes.map((node) => node.id))
      set({
        ...patchSubject(
          state,
          (current) => ({
            ...current,
            weeks: current.weeks.map(clearGateProgress),
            nodes: current.nodes.map((node) => resetNodeProgress(node, at)),
            cards: current.cards.map((card) => resetCardProgress(card, at)),
            resources: current.resources.map((resource) => ({ ...resource, status: 'toRead' })),
          }),
          at,
        ),
        overrides: pruneOverrides(state.overrides, weekIds, nodeIds),
      })
      return {
        ok: true,
        message: `${subject.shortName} progress cleared. Content is untouched, and Undo restores it.`,
      }
    }

    const seed = createSeedData()
    set({
      ...seed,
      prefs: {
        ...seed.prefs,
        theme: state.prefs.theme,
        mode: state.prefs.mode,
        sidebarCollapsed: state.prefs.sidebarCollapsed,
      },
      planner: { ...state.planner, studyDays: [...state.planner.studyDays] },
      hydrated: true,
    })
    return {
      ok: true,
      message: 'Everything reset to the seed plan. Undo restores the previous state; export a backup first for a permanent copy.',
    }
  },

  undo: () => {
    const entry = popUndo()
    if (!entry) return false
    set({ ...entry.before })
    return true
  },

  redo: () => {
    const entry = popRedo()
    if (!entry) return false
    set({ ...entry.after })
    return true
  },

  markExported: () => set((state) => ({ prefs: { ...state.prefs, lastExportAt: now() } })),

  updatePrefs: (patch) =>
    set((state) => ({ prefs: { ...state.prefs, ...patch }, updatedAt: now() })),

  updatePlanner: (patch) =>
    set((state) => {
      const next = { ...state.planner, ...patch }
      const clamp = (value: number, min: number, max: number) =>
        Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : min)))
      let studyDays = [...new Set(next.studyDays)]
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .sort((a, b) => a - b)
      let bufferDay = next.bufferDay
      if (studyDays.length >= 7) bufferDay = null
      if (bufferDay !== null) {
        const pruned = studyDays.filter((day) => day !== bufferDay)
        if (pruned.length > 0) studyDays = pruned
        else bufferDay = null
      }
      if (studyDays.length === 0) {
        studyDays = [...DEFAULT_PLANNER.studyDays]
        bufferDay = null
      }
      return {
        planner: {
          weeklyActiveMinutes: clamp(next.weeklyActiveMinutes, 0, 10_080),
          weeklyPassiveMinutes: clamp(next.weeklyPassiveMinutes, 0, 10_080),
          studyDays,
          bufferDay,
          sessionMinutes: clamp(next.sessionMinutes, 5, 180),
        },
        updatedAt: now(),
      }
    }),

  savePromptOverride: (promptId, template) => {
    const trimmed = template.trim().slice(0, PROMPT_TEMPLATE_MAX_CHARS)
    if (!trimmed) return
    set((state) => ({
      promptOverrides: {
        ...state.promptOverrides,
        [promptId]: trimmed,
      },
      updatedAt: now(),
    }))
  },

  resetPromptOverride: (promptId) =>
    set((state) => {
      const promptOverrides = { ...state.promptOverrides }
      delete promptOverrides[promptId]
      return { promptOverrides, updatedAt: now() }
    }),
}))

export function useActiveSubject(): Subject {
  return useAppStore((state) => activeSubjectOf(state) ?? state.subjects[0]!)
}

export function useActiveWeek(): Week | undefined {
  const subject = useActiveSubject()
  const overrides = useAppStore((state) => state.overrides)
  return activeWeek(subject.weeks, overrides)
}

export function getStoredAppData(): AppData {
  const state = useAppStore.getState()
  return {
    schemaVersion: state.schemaVersion,
    seedVersion: state.seedVersion,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    activeSubjectId: state.activeSubjectId,
    subjects: state.subjects,
    books: state.books,
    dailyLog: state.dailyLog,
    overrides: state.overrides,
    prefs: state.prefs,
    planner: state.planner,
    promptOverrides: state.promptOverrides,
    journey: state.journey,
    dayPlans: state.dayPlans,
    trash: state.trash,
  }
}

let autosaveStarted = false
let saveTimer: ReturnType<typeof setTimeout> | undefined
let pending = false
let running = false

async function flush(): Promise<void> {
  if (running) return
  running = true
  try {
    while (pending) {
      pending = false
      try {
        await savePersisted(getStoredAppData())
        setSaveState('saved')
      } catch (error) {
        setSaveState('error', error instanceof Error ? error.message : 'Unknown storage error')
        break
      }
    }
  } finally {
    running = false
  }
}

function scheduleSave(): void {
  pending = true
  setSaveState('saving')
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    void flush()
  }, 500)
}

export function startAutosave(): void {
  if (autosaveStarted) return
  autosaveStarted = true
  useAppStore.subscribe(() => scheduleSave())
  window.addEventListener('pagehide', () => {
    mirrorNow(getStoredAppData())
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      mirrorNow(getStoredAppData())
      void flush()
    }
  })
}

export function applyHydratedData(data: AppData, issue: 'corrupt' | null): void {
  const { data: refreshed } = refreshSeedContent(data)
  useAppStore.setState({
    ...refreshed,
    hydrated: true,
    bootIssue: issue,
  })
}

/**
 * Every user-visible content mutation is undoable. Preferences and navigation
 * are deliberately excluded: undoing a theme change is confusing, and undoing
 * a tab switch is meaningless.
 */
const UNDOABLE_ACTIONS: Record<string, string> = {
  addSubject: 'Create track',
  startCourse: 'Start course',
  restartCourse: 'Restart clock',
  pauseCourse: 'Pause course',
  resumeCourse: 'Resume course',
  saveDayPlans: 'Save day cards',
  deleteDayPlans: 'Delete day cards',
  deleteSubject: 'Delete track',
  restoreTrash: 'Restore from trash',
  toggleChecklist: 'Toggle task',
  saveGate: 'Save checkpoint',
  addWeek: 'Add week',
  updateWeek: 'Edit week',
  deleteWeek: 'Delete week',
  startNode: 'Start concept',
  markNodeMastered: 'Master concept',
  logNodeReview: 'Log review',
  failKnowledgePoint: 'Log mistake',
  clearRepair: 'Clear repair drill',
  addNode: 'Add concept',
  updateNode: 'Edit concept',
  deleteNode: 'Delete concept',
  addCard: 'Add flashcard',
  updateCard: 'Edit flashcard',
  deleteCard: 'Delete flashcard',
  reviewCard: 'Review flashcard',
  addResource: 'Add resource',
  cycleResource: 'Update resource status',
  updateResource: 'Edit resource',
  deleteResource: 'Delete resource',
  updateBook: 'Update book progress',
  addBook: 'Add book',
  deleteBook: 'Delete book',
  toggleDailyItem: 'Toggle daily habit',
  unlockWeek: 'Unlock week',
  unlockNode: 'Unlock concept',
  clearOverride: 'Clear override',
  importData: 'Import data',
  resetToSeed: 'Reset to seed',
  resetChecklistItem: 'Uncheck task',
  resetProgress: 'Reset progress',
  savePromptOverride: 'Edit prompt skill',
  resetPromptOverride: 'Reset prompt skill',
}

function installUndo(): void {
  const initial = useAppStore.getState()
  const patch: Record<string, unknown> = {}
  for (const [key, label] of Object.entries(UNDOABLE_ACTIONS)) {
    const original = initial[key as keyof typeof initial]
    if (typeof original !== 'function') continue
    patch[key] = (...args: unknown[]) => {
      const before = snapshotOf(getStoredAppData())
      const result = (original as (...inner: unknown[]) => unknown).apply(null, args)
      const after = snapshotOf(getStoredAppData())
      if (!snapshotsEqual(before, after)) recordHistory(label, before, after)
      return result
    }
  }
  useAppStore.setState(patch as Partial<AppStore>)
}

installUndo()
