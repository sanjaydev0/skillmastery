import { describe, expect, it } from 'vitest'
import type { MasteryScores } from '../types/schema'
import { isWeekAvailable, nodeBadge } from '../engine/gating'
import { toBackupJson } from '../lib/utils'
import { parseBackupJson } from '../services/validation'
import { getStoredAppData, useAppStore } from './AppStore'

const pass: MasteryScores = { concept: 4, implementation: 4, craft: 4, debugging: 4 }

function activeSubject() {
  const state = useAppStore.getState()
  return state.subjects.find((subject) => subject.id === state.activeSubjectId)!
}

describe('gate and FIRe integration', () => {
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
    useAppStore.getState().saveGate(week1.id, { ...pass, concept: 5 })
    expect(activeSubject().weeks.find((week) => week.id === week1.id)!.gate.passedAt).toBe(firstPass)
  })

  it('FIRe-credits encompassed nodes on a gate pass without marking them mastered', () => {
    const subject = activeSubject()
    const weeks = [...subject.weeks].sort((a, b) => a.weekNumber - b.weekNumber)
    for (const week of weeks.slice(0, 2)) {
      expect(useAppStore.getState().saveGate(week.id, pass).ok).toBe(true)
    }
    const week3 = weeks[2]!
    const encompassed = week3.encompassedNodeIds
    expect(encompassed.length).toBeGreaterThan(0)

    const result = useAppStore.getState().saveGate(week3.id, pass)
    expect(result.ok).toBe(true)
    expect(result.credits).toBe(encompassed.length)
    const after = activeSubject()
    for (const nodeId of encompassed) {
      const node = after.nodes.find((entry) => entry.id === nodeId)!
      expect(node.srs.strength).toBeGreaterThan(0)
      expect(node.srs.implicitReviews).toBeGreaterThan(0)
      expect(node.status).not.toBe('mastered')
    }
  })
})

describe('node mastery and remediation', () => {
  it('blocks a node with unmet prerequisites, then allows an audited override', () => {
    const subject = activeSubject()
    const target = subject.nodes.find((node) => node.prerequisiteIds.length > 0)!
    const blocked = useAppStore.getState().markNodeMastered(target.id)
    expect(blocked.ok).toBe(false)
    expect(blocked.message).toMatch(/prerequisites/i)

    useAppStore.getState().unlockNode(target.id)
    const allowed = useAppStore.getState().markNodeMastered(target.id)
    expect(allowed.ok).toBe(true)
    const mastered = activeSubject().nodes.find((node) => node.id === target.id)!
    expect(mastered.status).toBe('mastered')
    expect(mastered.srs.strength).toBe(1)
    expect(nodeBadge(mastered, activeSubject(), useAppStore.getState().overrides)).toBe('mastered')
  })

  it('flags direct prerequisites and schedules 30-minute repair after two failures', () => {
    const subject = activeSubject()
    const target = subject.nodes.find((node) => node.prerequisiteIds.length > 0)!
    const prereqId = target.prerequisiteIds[0]!
    const kpId = target.knowledgePoints[0]!.id

    const first = useAppStore.getState().failKnowledgePoint(target.id, kpId)
    expect(first.ok).toBe(true)
    expect(first.message).toMatch(/1\/2/)
    expect(activeSubject().nodes.find((node) => node.id === prereqId)!.repairFlags).toHaveLength(0)

    const second = useAppStore.getState().failKnowledgePoint(target.id, kpId)
    expect(second.ok).toBe(true)
    const after = activeSubject()
    const failed = after.nodes.find((node) => node.id === target.id)!
    const prereq = after.nodes.find((node) => node.id === prereqId)!
    expect(failed.status).toBe('needs-repair')
    expect(prereq.repairFlags.some((flag) => flag.fromNodeId === target.id && !flag.clearedAt)).toBe(true)

    const flag = prereq.repairFlags.find((entry) => !entry.clearedAt)!
    useAppStore.getState().clearRepair(prereq.id, flag.id)
    const cleared = activeSubject().nodes.find((node) => node.id === prereq.id)!
    expect(cleared.repairFlags.find((entry) => entry.id === flag.id)?.clearedAt).toBeTypeOf('number')
    expect(cleared.srs.strength).toBe(1)
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
    expect(custom.nodes).toHaveLength(0)
    expect(custom.accent).toBe('amber')

    useAppStore.getState().setTheme('light')
    useAppStore.getState().setMode('passive')
    useAppStore.getState().resetToSeed()
    const reset = useAppStore.getState()
    expect(reset.subjects).toHaveLength(2)
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
    expect(replaced.subjects).toHaveLength(3)
    expect(replaced.prefs.theme).toBe('light')
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
