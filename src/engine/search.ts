import type { Book, Subject } from '../types/schema'

export type SearchKind = 'week' | 'node' | 'card' | 'resource' | 'book'

export interface SearchDoc {
  id: string
  kind: SearchKind
  title: string
  subtitle: string
  tags: string[]
  subjectId?: string
  subjectName?: string
  hash: string
  haystack: string
}

const KIND_WEIGHT: Record<SearchKind, number> = {
  week: 8,
  node: 6,
  card: 4,
  resource: 3,
  book: 2,
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function isSubsequence(query: string, target: string): boolean {
  let qi = 0
  for (let i = 0; i < target.length && qi < query.length; i++) {
    if (target[i] === query[qi]) qi++
  }
  return qi === query.length
}

function scoreDoc(doc: SearchDoc, query: string): number {
  const title = normalise(doc.title)
  const hay = doc.haystack
  if (title === query) return 200
  if (title.startsWith(query)) return 160
  if (title.includes(query)) return 130
  const tokens = query.split(/\s+/).filter(Boolean)
  if (tokens.length > 1 && tokens.every((token) => hay.includes(token))) return 110
  if (hay.includes(query)) return 80
  if (isSubsequence(query, title)) return 55
  const tag = doc.tags.some((t) => normalise(t).includes(query))
  if (tag) return 40
  return 0
}

export function buildSearchIndex(subjects: Subject[], books: Book[]): SearchDoc[] {
  const docs: SearchDoc[] = []
  for (const subject of subjects) {
    for (const week of subject.weeks) {
      const nodeTitles = subject.nodes
        .filter((node) => node.weekId === week.id)
        .map((node) => node.title)
        .join(' ')
      const haystack = normalise(
        [week.title, week.anchor, week.bookFocus, week.capstone ?? '', nodeTitles, 'week ' + week.weekNumber].join(' '),
      )
      docs.push({
        id: week.id,
        kind: 'week',
        title: `Week ${week.weekNumber} · ${week.title}`,
        subtitle: week.anchor,
        tags: [`week-${week.weekNumber}`],
        subjectId: subject.id,
        subjectName: subject.shortName,
        hash: `#/plan/${week.id}`,
        haystack,
      })
    }
    for (const node of subject.nodes) {
      const week = subject.weeks.find((w) => w.id === node.weekId)
      const kpText = node.knowledgePoints
        .map((kp) => `${kp.primitive} ${kp.concept} ${kp.failureMode}`)
        .join(' ')
      docs.push({
        id: node.id,
        kind: 'node',
        title: node.title,
        subtitle: week ? `Week ${week.weekNumber} · ${node.tags.slice(0, 2).join(' · ')}` : 'Knowledge node',
        tags: node.tags,
        subjectId: subject.id,
        subjectName: subject.shortName,
        hash: `#/node/${node.id}`,
        haystack: normalise([node.title, node.tags.join(' '), kpText, node.notes ?? ''].join(' ')),
      })
    }
    for (const card of subject.cards) {
      docs.push({
        id: card.id,
        kind: 'card',
        title: card.front,
        subtitle: card.back.slice(0, 120),
        tags: card.tags,
        subjectId: subject.id,
        subjectName: subject.shortName,
        hash: `#/practice`,
        haystack: normalise(`${card.front} ${card.back} ${card.tags.join(' ')}`),
      })
    }
    for (const resource of subject.resources) {
      docs.push({
        id: resource.id,
        kind: 'resource',
        title: resource.title,
        subtitle: resource.description ?? resource.url,
        tags: resource.tags,
        subjectId: subject.id,
        subjectName: subject.shortName,
        hash: `#/library`,
        haystack: normalise(`${resource.title} ${resource.url} ${resource.tags.join(' ')}`),
      })
    }
  }
  for (const book of books) {
    docs.push({
      id: book.id,
      kind: 'book',
      title: book.title,
      subtitle: `${book.author} · ${book.pillar}`,
      tags: ['book canon', book.pillar],
      hash: '#/library',
      haystack: normalise(`${book.title} ${book.author} ${book.pillar} ${book.notes ?? ''}`),
    })
  }
  return docs
}

export function searchIndex(docs: SearchDoc[], rawQuery: string, limit = 24): SearchDoc[] {
  const query = normalise(rawQuery.trim())
  if (!query) return []
  return docs
    .map((doc) => ({ doc, score: scoreDoc(doc, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || KIND_WEIGHT[b.doc.kind] - KIND_WEIGHT[a.doc.kind])
    .slice(0, limit)
    .map((entry) => entry.doc)
}
