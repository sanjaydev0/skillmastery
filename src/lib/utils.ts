import type { AppData, Book, Concept, Flashcard, Subject, Week } from '../types/schema'
import { formatDateTime, relativeDays } from '../lib/dates'

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function uniqueId(prefix = 'id'): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    : Math.random().toString(36).slice(2, 12)
  return `${prefix}-${random}`
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function percent(value: number): number {
  return Math.round(clamp(value, 0, 1) * 100)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function sanitiseTags(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((tag) => tag.trim().replace(/^#/, '').replace(/\s+/g, '-'))
    .filter(Boolean)
    .slice(0, 12)
}

export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

export function fileStamp(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
}

/* ---------------- Anki ---------------- */

export interface AnkiOptions {
  deck: string
  concepts?: Concept[]
  weeks?: Week[]
}

function ankiField(value: string): string {
  return value.replace(/\t/g, '    ').replace(/\r?\n/g, '<br>').replace(/\s+/g, ' ').trim()
}

function ankiTag(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[",]/g, '')
    .replace(/#/g, '')
}

export function ankiRows(cards: Flashcard[], options: AnkiOptions): string[][] {
  const conceptTerm = new Map((options.concepts ?? []).map((concept) => [concept.id, concept.term]))
  const weekTitle = new Map((options.weeks ?? []).map((week) => [week.id, `W${week.weekNumber}`]))
  return cards.map((card) => {
    const tags = [...card.tags.map(ankiTag), card.source === 'mistake' ? 'mistake-log' : 'core']
    const context = [card.weekId ? weekTitle.get(card.weekId) : '', card.nodeId ? conceptTerm.get(card.nodeId) : '']
      .filter(Boolean)
      .join(' · ')
    return [ankiField(card.front), ankiField(card.back), tags.filter(Boolean).join(' '), card.source, context]
  })
}

export function toAnkiTsv(cards: Flashcard[], options: AnkiOptions): string {
  const lines = [
    '#separator:tab',
    '#html:true',
    '#tags column:3',
    `#deck:${options.deck}`,
    '#notetype:Basic',
    ...ankiRows(cards, options).map((row) => row.join('\t')),
  ]
  return lines.join('\n')
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function toAnkiCsv(cards: Flashcard[], options: AnkiOptions): string {
  const rows = ankiRows(cards, options)
  const lines = [
    '#separator:Comma',
    '#html:true',
    '#tags column:3',
    `#deck:${options.deck}`,
    '#notetype:Basic',
    ['Front', 'Back', 'Tags', 'Source', 'Context'].map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ]
  return lines.join('\n')
}

/* ---------------- Obsidian ---------------- */

export function toObsidianMarkdown(subject: Subject, books: Book[], now = new Date()): string {
  const weeksMastered = subject.weeks.filter((week) => week.gate.passedAt).length
  const conceptsProved = subject.concepts.filter(
    (concept) => concept.checks[concept.checks.length - 1]?.outcome === 'cold',
  ).length
  const lines: string[] = [
    '---',
    `title: "${subject.name}"`,
    'source: SkillMastery',
    `exported: ${now.toISOString()}`,
    `weeks_mastered: ${weeksMastered}/${subject.weeks.length}`,
    `concepts_proved: ${conceptsProved}/${subject.concepts.length}`,
    'tags: [skillmastery, learning-log]',
    '---',
    '',
    `# ${subject.name}`,
    '',
    `> ${subject.tagline}`,
    '',
    `Compiled ${formatDateTime(now.getTime())} · ${weeksMastered}/${subject.weeks.length} weeks cleared · ${conceptsProved}/${subject.concepts.length} concepts proved.`,
    '',
  ]

  for (const phase of subject.phases) {
    lines.push(`## ${phase.name}`, '', `_${phase.subtitle}_`, '')
    const weeks = subject.weeks
      .filter((week) => week.phaseId === phase.id)
      .sort((a, b) => a.weekNumber - b.weekNumber)
    for (const week of weeks) {
      const gate = week.gate.passedAt ? 'Mastered' : week.gate.scores ? 'Attempted' : 'Open'
      lines.push(`### Week ${String(week.weekNumber).padStart(2, '0')} — ${week.title}`, '')
      lines.push(`**First-principles anchor:** ${week.anchor}`, '')
      lines.push(`**Mastery gate:** ${gate}${week.gate.passedAt ? ` · ${formatDateTime(week.gate.passedAt)}` : ''}`, '')
      if (week.bookFocus) lines.push(`**Canon (30m/day):** ${week.bookFocus}`, '')
      if (week.capstone) lines.push(`**Capstone:** ${week.capstone}`, '')
      if (week.rabbitHoles.length) {
        lines.push('**Parked rabbit holes:**', ...week.rabbitHoles.map((item) => `- ${item}`), '')
      }
      const done = week.checklist.filter((item) => item.done).length
      lines.push(`**Checklist:** ${done}/${week.checklist.length} complete`, '')
      for (const item of week.checklist) {
        lines.push(`- [${item.done ? 'x' : ' '}] ${item.label}${item.minutes ? ` _(${item.minutes}m)_` : ''}`)
      }
      lines.push('')

      const concepts = subject.concepts.filter((concept) => concept.weekId === week.id)
      if (concepts.length) {
        lines.push('#### Concepts', '')
        for (const concept of concepts) {
          const last = concept.checks[concept.checks.length - 1]
          lines.push(
            `##### [[${slugify(subject.shortName)}-${concept.id}|${concept.term}]]`,
            '',
            `Proved: **${last ? last.outcome : 'not yet'}**${concept.dueAt ? ` · next review ${relativeDays(concept.dueAt)}` : ''}`,
            '',
            concept.definition || '',
          )
          if (concept.failureMode) {
            lines.push('', `The mistake it prevents: ${concept.failureMode}`)
          }
          lines.push('')
        }
      }

      const cards = subject.cards.filter((card) => card.weekId === week.id)
      if (cards.length) {
        lines.push('#### Active recall', '')
        for (const card of cards) {
          lines.push(`**Q:** ${card.front}`, `**A:** ${card.back}`, '')
        }
      }
    }
  }

  if (books.length) {
    lines.push('## Canon progress', '')
    for (const book of books) {
      lines.push(`- **${book.title}** — ${book.author} · chapter ${book.currentChapter}/${book.totalChapters} · ${book.status}`)
    }
    lines.push('')
  }

  lines.push('## Resource vault', '')
  for (const resource of subject.resources) {
    lines.push(`- [${resource.title}](${resource.url}) — ${resource.status} · ${resource.kind}`)
  }
  lines.push('')
  return lines.join('\n')
}

/* ---------------- Backup ---------------- */

export function toBackupJson(data: AppData): string {
  return JSON.stringify(
    {
      app: 'skillmastery',
      schemaVersion: data.schemaVersion,
      exportedAt: new Date().toISOString(),
      data,
    },
    null,
    2,
  )
}
