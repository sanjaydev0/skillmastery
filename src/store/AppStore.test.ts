import { describe, expect, it } from 'vitest'
import type { GateChecks } from '../types/schema'
import { isWeekAvailable } from '../engine/gating'
import { PROOF_INTERVALS } from '../engine/proofs'
import { startOfLocalDay, dateKey } from '../lib/dates'
import { toBackupJson } from '../lib/utils'
import { parseBackupJson } from '../services/validation'
import { getStoredAppData, useAppStore } from './AppStore'

const pass: GateChecks = { explain: true, build: true, finish: true, debug: true }

function activeSubject() {
  const state = useAppStore.getState()
  return state.subjects.find((subject) => subject.id === state.activeSubjectId)!
}

describe('gate integration', () => {
  it('clears a gate, unlocks the next week and keeps the first passed timestamp', () => {
    const subject = activeSubject()
    const week1 = subject.weeks.find((week) => week.weekNumber === 1)!
    const week2 = subject.weeks.find((week) => week.weekNumber === 2)!
    expect(isWeekAvailable(week2, subject.weeks, useAppStore.getState().overrides)).toBe(false)

    const result = useAppStore.getState().saveGate(week1.id, pass)
    expect(result.ok).toBe(true)
    const after = activeSubject()
    const passedWeek = after.weeks.find((week) => week.id === week1.id)!
    expect(passedWeek.gate.passedAt).toBeTypeOf('number')
    expect(isWeekAvailable(week2, after.weeks, useAppStore.getState().overrides)).toBe(true)

    const firstPass = passedWeek.gate.passedAt
    useAppStore.getState().saveGate(week1.id, { ...pass })
    expect(activeSubject().weeks.find((week) => week.id === week1.id)!.gate.passedAt).toBe(firstPass)
  })
})

describe('concept proofs', () => {
  function firstConcept() {
    const subject = activeSubject()
    const week = subject.weeks.find((entry) => entry.weekNumber === 1)!
    return subject.concepts.find((concept) => concept.weekId === week.id)!
  }

  it('advances the ladder and schedules the next review on a cold proof', () => {
    const concept = firstConcept()
    const result = useAppStore.getState().checkConcept(concept.id, 'cold', 'said it out loud')
    expect(result.ok).toBe(true)
    const after = activeSubject().concepts.find((entry) => entry.id === concept.id)!
    expect(after.checks).toHaveLength(1)
    expect(after.checks[0]).toMatchObject({ outcome: 'cold', note: 'said it out loud' })
    expect(after.step).toBe(0)
    expect(after.dueAt).toBeGreaterThan(after.checks[0]!.at)
    expect(after.dueAt).toBe(
      startOfLocalDay(new Date(after.checks[0]!.at)) + PROOF_INTERVALS[0]! * 86_400_000,
    )
  })

  it('steps back on a warm proof and resets on a failed one', () => {
    const concept = firstConcept()
    useAppStore.getState().checkConcept(concept.id, 'cold')
    useAppStore.getState().checkConcept(concept.id, 'cold')
    expect(activeSubject().concepts.find((entry) => entry.id === concept.id)!.step).toBe(1)

    useAppStore.getState().checkConcept(concept.id, 'warm')
    expect(activeSubject().concepts.find((entry) => entry.id === concept.id)!.step).toBe(0)

    useAppStore.getState().checkConcept(concept.id, 'failed', 'forgot the rule')
    const failed = activeSubject().concepts.find((entry) => entry.id === concept.id)!
    expect(failed.step).toBe(0)
    expect(failed.checks[failed.checks.length - 1]).toMatchObject({
      outcome: 'failed',
      note: 'forgot the rule',
    })
  })

  it('keeps a note on the concept without inventing a proof', () => {
    const concept = firstConcept()
    useAppStore.getState().setConceptNote(concept.id, 'Read the language tour again')
    const after = activeSubject().concepts.find((entry) => entry.id === concept.id)!
    expect(after.notes).toBe('Read the language tour again')
    expect(after.checks).toEqual([])
  })
})

describe('track lifecycle and backup import', () => {
  it('creates a track with four phases and a starter week, then resets to seed', () => {
    const blank = useAppStore.getState().addSubject({ name: '  ', shortName: '', tagline: '', accent: 'violet' })
    expect(blank.ok).toBe(false)

    const created = useAppStore.getState().addSubject({
      name: 'Rust Systems',
      shortName: 'Rust',
      tagline: 'Own the machine.',
      accent: 'amber',
    })
    expect(created.ok).toBe(true)
    const custom = activeSubject()
    expect(custom.name).toBe('Rust Systems')
    expect(custom.phases).toHaveLength(4)
    expect(custom.weeks).toHaveLength(1)
    expect(custom.concepts).toHaveLength(0)
    expect(custom.accent).toBe('amber')

    useAppStore.getState().setTheme('light')
    useAppStore.getState().setMode('passive')
    useAppStore.getState().resetToSeed()
    const reset = useAppStore.getState()
    expect(reset.subjects).toHaveLength(1)
    expect(reset.activeSubjectId).toBe(reset.subjects[0]!.id)
    expect(reset.prefs.theme).toBe('light')
    expect(reset.prefs.mode).toBe('passive')
  })

  it('validates and replaces data while preserving the current theme', () => {
    useAppStore.getState().addSubject({
      name: 'Temporary Track',
      shortName: 'Temp',
      tagline: '',
      accent: 'emerald',
    })
    const backup = parseBackupJson(toBackupJson(getStoredAppData())).data
    backup.subjects[0]!.name = 'Renamed Flutter'
    backup.prefs.theme = 'dark'
    useAppStore.getState().setTheme('light')

    useAppStore.getState().importData(backup, 'replace')
    const replaced = useAppStore.getState()
    expect(replaced.subjects[0]!.name).toBe('Renamed Flutter')
    expect(replaced.subjects).toHaveLength(2)
    expect(replaced.prefs.theme).toBe('light')
  })

  it('saves and resets a prompt skill in persisted data', () => {
    useAppStore.getState().savePromptOverride('socratic-tutor', 'My edited Socratic skill')
    expect(getStoredAppData().promptOverrides['socratic-tutor']).toBe('My edited Socratic skill')
    useAppStore.getState().savePromptOverride('socratic-tutor', '   ')
    expect(getStoredAppData().promptOverrides['socratic-tutor']).toBe('My edited Socratic skill')
    useAppStore.getState().resetPromptOverride('socratic-tutor')
    expect(getStoredAppData().promptOverrides['socratic-tutor']).toBeUndefined()
  })

  it('keeps local prompt skills when an incoming backup is merged', () => {
    const base = structuredClone(getStoredAppData())
    useAppStore.getState().savePromptOverride('socratic-tutor', 'Local skill')
    const incoming = structuredClone(base)
    incoming.promptOverrides = {
      'socratic-tutor': 'Incoming skill',
      'anki-generator': 'Incoming card skill',
    }

    useAppStore.getState().importData(incoming, 'merge')
    const merged = useAppStore.getState()
    expect(merged.promptOverrides['socratic-tutor']).toBe('Local skill')
    expect(merged.promptOverrides['anki-generator']).toBe('Incoming card skill')
  })

  it('merges subjects by id and keeps higher reading progress', () => {
    const base = structuredClone(getStoredAppData())
    const incoming = structuredClone(base)
    incoming.subjects[0]!.name = 'Merged Flutter'
    incoming.books[0]!.currentChapter = base.books[0]!.currentChapter + 5
    incoming.books[0]!.status = 'reading'

    useAppStore.getState().importData(incoming, 'merge')
    const merged = useAppStore.getState()
    expect(merged.subjects).toHaveLength(base.subjects.length)
    expect(merged.subjects[0]!.name).toBe('Merged Flutter')
    expect(merged.books[0]!.currentChapter).toBe(incoming.books[0]!.currentChapter)
  })
})

describe('bug log', () => {
  it('saves one line for today and clears a blank note', () => {
    const key = dateKey()
    useAppStore.getState().saveBugNote('RenderFlex overflowed; wrapped the row in Expanded')
    expect(useAppStore.getState().bugLog[key]).toBe(
      'RenderFlex overflowed; wrapped the row in Expanded',
    )

    useAppStore.getState().saveBugNote('   ')
    expect(useAppStore.getState().bugLog[key]).toBeUndefined()
  })

  it('keeps this device on a shared date during a merge', () => {
    const key = dateKey()
    useAppStore.getState().saveBugNote('local fix')
    const incoming = structuredClone(getStoredAppData())
    incoming.bugLog[key] = 'incoming fix'
    incoming.bugLog['2026-01-01'] = 'older day'

    useAppStore.getState().importData(incoming, 'merge')
    const merged = useAppStore.getState()
    expect(merged.bugLog[key]).toBe('local fix')
    expect(merged.bugLog['2026-01-01']).toBe('older day')
  })
})
