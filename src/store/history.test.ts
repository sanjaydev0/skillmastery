import { beforeEach, describe, expect, it } from 'vitest'
import { createSeedData } from '../data/seedData'
import { clearHistory, historyDepth, listHistory } from '../services/history'
import type { Week } from '../types/schema'
import { DEFAULT_PLANNER } from '../types/schema'
import { useAppStore } from './AppStore'

function resetStore(): void {
  clearHistory()
  useAppStore.setState({ ...createSeedData(), hydrated: true })
}

function firstWeek(): Week {
  return useAppStore.getState().subjects[0]!.weeks[0]!
}

beforeEach(resetStore)

describe('undo and redo', () => {
  it('reverses and reapplies a task toggle', () => {
    const week = firstWeek()
    const taskId = week.checklist[0]!.id

    useAppStore.getState().toggleChecklist(week.id, taskId)
    expect(useAppStore.getState().subjects[0]!.weeks[0]!.checklist[0]!.done).toBe(true)
    expect(historyDepth()).toEqual({ undo: 1, redo: 0 })

    expect(useAppStore.getState().undo()).toBe(true)
    expect(useAppStore.getState().subjects[0]!.weeks[0]!.checklist[0]!.done).toBe(false)
    expect(historyDepth()).toEqual({ undo: 0, redo: 1 })

    expect(useAppStore.getState().redo()).toBe(true)
    expect(useAppStore.getState().subjects[0]!.weeks[0]!.checklist[0]!.done).toBe(true)
  })

  it('does not record preference or navigation changes', () => {
    useAppStore.getState().setTheme('light')
    useAppStore.getState().setMode('passive')
    expect(historyDepth()).toEqual({ undo: 0, redo: 0 })
  })

  it('drops the redo branch after a new action', () => {
    const week = firstWeek()
    const [first, second] = week.checklist
    useAppStore.getState().toggleChecklist(week.id, first!.id)
    useAppStore.getState().undo()
    expect(historyDepth()).toEqual({ undo: 0, redo: 1 })

    useAppStore.getState().toggleChecklist(week.id, second!.id)
    expect(historyDepth()).toEqual({ undo: 1, redo: 0 })
  })

  it('caps history at fifty entries', () => {
    const week = firstWeek()
    const taskId = week.checklist[0]!.id
    for (let index = 0; index < 55; index++) {
      useAppStore.getState().toggleChecklist(week.id, taskId)
    }
    expect(historyDepth().undo).toBe(50)
    expect(listHistory()).toHaveLength(50)
  })
})

describe('scoped resets', () => {
  it('clears only the chosen week and restores it through undo', () => {
    const week = firstWeek()
    const taskId = week.checklist[0]!.id
    const store = useAppStore.getState()
    store.toggleChecklist(week.id, taskId)
    store.saveGate(week.id, { concept: 4, implementation: 4, craft: 4, debugging: 4 })

    const result = useAppStore.getState().resetProgress('week', week.id)
    expect(result.ok).toBe(true)

    const reset = useAppStore.getState().subjects[0]!.weeks[0]!
    expect(reset.checklist.every((item) => !item.done)).toBe(true)
    expect(reset.gate.attempts).toHaveLength(0)
    expect(reset.gate.notes).toBe(week.gate.notes)
    // Other weeks keep their progress.
    expect(useAppStore.getState().subjects[0]!.weeks[1]!.checklist.every((item) => !item.done)).toBe(true)

    useAppStore.getState().undo()
    const restored = useAppStore.getState().subjects[0]!.weeks[0]!
    expect(restored.checklist[0]!.done).toBe(true)
    expect(restored.gate.attempts).toHaveLength(1)
  })

  it('returns nodes in the reset week to locked without deleting them', () => {
    const week = firstWeek()
    const node = useAppStore.getState().subjects[0]!.nodes.find((entry) => entry.weekId === week.id)!
    useAppStore.getState().startNode(node.id)
    expect(useAppStore.getState().subjects[0]!.nodes.find((entry) => entry.id === node.id)!.status).toBe('learning')

    useAppStore.getState().resetProgress('week', week.id)
    const after = useAppStore.getState().subjects[0]!.nodes.find((entry) => entry.id === node.id)!
    expect(after.status).toBe('locked')
    expect(after.id).toBe(node.id)
  })

  it('resets a whole subject while keeping the planner and theme', () => {
    const week = firstWeek()
    useAppStore.getState().toggleChecklist(week.id, week.checklist[0]!.id)
    useAppStore.getState().setTheme('light')
    useAppStore.setState({ planner: { ...DEFAULT_PLANNER, weekdayActiveMinutes: 45 } })

    const result = useAppStore.getState().resetProgress('subject')
    expect(result.ok).toBe(true)
    expect(useAppStore.getState().subjects[0]!.weeks[0]!.checklist[0]!.done).toBe(false)
    expect(useAppStore.getState().planner.weekdayActiveMinutes).toBe(45)
    expect(useAppStore.getState().prefs.theme).toBe('light')
  })

  it('resets everything to the seed and remains undoable', () => {
    const week = firstWeek()
    useAppStore.getState().toggleChecklist(week.id, week.checklist[0]!.id)
    useAppStore.getState().resetProgress('all')
    expect(useAppStore.getState().subjects[0]!.weeks[0]!.checklist[0]!.done).toBe(false)

    useAppStore.getState().undo()
    expect(useAppStore.getState().subjects[0]!.weeks[0]!.checklist[0]!.done).toBe(true)
  })
})

describe('planner settings', () => {
  it('clamps capacity and never enters the undo history', () => {
    useAppStore.getState().updatePlanner({
      weekdayActiveMinutes: 5000,
      weekdayPassiveMinutes: -10,
      sessionMinutes: 1,
    })
    const planner = useAppStore.getState().planner
    expect(planner.weekdayActiveMinutes).toBe(720)
    expect(planner.weekdayPassiveMinutes).toBe(0)
    expect(planner.sessionMinutes).toBe(5)
    expect(historyDepth()).toEqual({ undo: 0, redo: 0 })
  })
})
