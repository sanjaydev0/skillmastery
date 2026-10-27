import { describe, expect, it } from 'vitest'
import type { Flashcard } from '../types/schema'
import { createSeedData } from '../data/seedData'
import { parseBackupJson } from '../services/validation'
import {
  toAnkiCsv,
  toAnkiTsv,
  toBackupJson,
  toObsidianMarkdown,
} from './utils'

const card: Flashcard = {
  id: 'card-1',
  weekId: 'fl-w1',
  nodeId: 'fl-w1-n1',
  front: 'What\tis "null safety"?',
  back: 'Sound analysis.\nNo bang operators.',
  tags: ['dart', 'null safety'],
  source: 'core',
  scheduleStep: 0,
  dueAt: 0,
  lapses: 0,
  reviews: 0,
  createdAt: 0,
  updatedAt: 0,
}

describe('Anki export', () => {
  it('writes TSV headers, avoids tabs/newlines in fields, sanitises tags and keeps context', () => {
    const seed = createSeedData()
    const subject = seed.subjects[0]!
    const tsv = toAnkiTsv([card], {
      deck: 'SkillMastery::Flutter',
      nodes: subject.nodes,
      weeks: subject.weeks,
    })
    expect(tsv).toContain('#separator:tab')
    expect(tsv).toContain('#deck:SkillMastery::Flutter')
    expect(tsv).toContain('What is "null safety"?')
    expect(tsv).toContain('Sound analysis.<br>No bang operators.')
    expect(tsv).toContain('dart null_safety core')
    expect(tsv).toContain('W1 · Value semantics: final, const and the heap')
    const row = tsv.split('\n').find((line) => line.startsWith('What is'))
    expect(row?.split('\t')).toHaveLength(5)
    expect(row).not.toContain('\t\t')
  })

  it('writes quoted CSV rows with a proper header', () => {
    const csv = toAnkiCsv([card], { deck: 'SkillMastery', nodes: [], weeks: [] })
    expect(csv).toContain('#separator:Comma')
    expect(csv).toContain('"Front","Back","Tags","Source","Context"')
    expect(csv).toContain('"What is ""null safety""?"')
    expect(csv).toContain('"Sound analysis.<br>No bang operators."')
  })
})

describe('Obsidian export', () => {
  it('includes frontmatter, phase/week hierarchy, nodes, cards, canon and resources', () => {
    const seed = createSeedData()
    const subject = seed.subjects[0]!
    const markdown = toObsidianMarkdown(subject, seed.books)
    expect(markdown.startsWith('---\n')).toBe(true)
    expect(markdown).toContain(`title: "${subject.name}"`)
    expect(markdown).toContain('source: SkillMastery')
    expect(markdown).toContain('## Phase 1 · Foundations')
    expect(markdown).toContain('### Week 01 — Dart types, sound null safety & memory models')
    expect(markdown).toContain('#### Knowledge nodes')
    expect(markdown).toContain('**Primitive:**')
    expect(markdown).toContain('**Q:**')
    expect(markdown).toContain('## Canon progress')
    expect(markdown).toContain('## Resource vault')
    expect(markdown).toContain('](https://')
  })
})

describe('backup envelope', () => {
  it('round-trips through the strict schema', () => {
    const seed = createSeedData()
    const raw = toBackupJson(seed)
    const parsedJSON = JSON.parse(raw) as { app: string; exportedAt: string; data: unknown }
    expect(parsedJSON.app).toBe('skillmastery')
    expect(Number.isNaN(Date.parse(parsedJSON.exportedAt))).toBe(false)

    const parsed = parseBackupJson(raw)
    expect(parsed.data.subjects).toHaveLength(2)
    expect(parsed.exportedAt).toBe(parsedJSON.exportedAt)
    expect(parsed.data.subjects[0]?.weeks).toHaveLength(24)
  })

  it('also accepts a bare AppData object', () => {
    const seed = createSeedData()
    const parsed = parseBackupJson(JSON.stringify(seed))
    expect(parsed.data.seedVersion).toBe(seed.seedVersion)
    expect(parsed.data.activeSubjectId).toBe(seed.activeSubjectId)
  })

  it('accepts the legacy backup envelope token', () => {
    const seed = createSeedData()
    const raw = JSON.stringify({
      app: 'masteryharness',
      exportedAt: new Date().toISOString(),
      data: seed,
    })
    const parsed = parseBackupJson(raw)
    expect(parsed.data.subjects).toHaveLength(2)
  })

  it('rejects invalid URLs and corrupt structures', () => {
    const seed = createSeedData()
    const invalid = structuredClone(seed)
    invalid.subjects[0]!.resources[0]!.url = 'not-a-url'
    expect(() => parseBackupJson(JSON.stringify(invalid))).toThrow()
    expect(() => parseBackupJson('{')).toThrow()
  })
})
