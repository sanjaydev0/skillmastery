import type { DayPlan, Journey, Subject, Week } from '../types/schema'
import { STYLE_CONTRACT } from '../content/style'
import { blueprintFor } from '../data/curriculum/blueprint'
import { courseDay, courseWeek } from '../lib/courseClock'
import { estimateOf } from './estimates'

/**
 * The context pack and the parser for generated weeks.
 *
 * The prompt is built from the subject, the week's blueprint and the learner's
 * own history. That history is the point: a generated week that ignores last
 * week's gate and known failure modes is a different course. The parser is
 * deliberately strict, because generated copy becomes curriculum.
 */

export const GENERATION_PROMPT_MAX_CHARS = 120_000
export const GENERATION_MAX_TOKENS = 8_000
export const GENERATION_TIMEOUT_MS = 280_000

export interface BriefChecklistItem {
  slot: number
  mode: 'active' | 'passive'
  label: string
  minutes: number
}

export interface BriefWeek {
  weekNumber: number
  title: string
  anchor: string
  outcomes: string[]
  project: string
  git: string
  checkpoint: string
  theme: string
  design: string
  terms: string[]
  days: string[]
  knowledgePoints: { primitive: string; concept: string; failureMode: string }[]
  checklist: BriefChecklistItem[]
}

export interface BriefHistory {
  weekNumber: number
  title: string
  project: string
  gate: string
  mastered: string[]
  failures: string[]
}

export interface WeekBrief {
  subjectId: string
  courseDay: number | null
  courseWeek: number | null
  week: BriefWeek
  history: BriefHistory[]
  mastered: string[]
  failures: string[]
  capacity: { active: number; passive: number }
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`
}

/**
 * The gate's task text lives in `gate.notes`; the blueprint holds the same
 * checkpoint in shorter form. Status is appended only when there is an attempt,
 * so the prompt never presents an untried gate as a result.
 */
function gateLine(week: Week, subject: Subject, withStatus = true): string {
  const blueprint = blueprintFor(subject.id, week.weekNumber)
  const task = (week.gate.notes ?? '').trim() || blueprint?.checkpoint || 'not recorded'
  const last = week.gate.attempts[week.gate.attempts.length - 1]
  if (!withStatus) return task
  const status = last
    ? `last attempt scored ${last.average.toFixed(1)}/5, ${last.passed ? 'passed' : 'not passed'}`
    : 'not attempted yet'
  return `${clip(task, 150)} — ${status}`
}

function failurePointsOf(week: Week, subject: Subject): string[] {
  const nodes = subject.nodes.filter((node) => node.weekId === week.id)
  return nodes
    .flatMap((node) =>
      node.knowledgePoints
        .filter((point) => point.fails > 0)
        .map((point) => `${node.title}: ${point.failureMode}`),
    )
    .slice(0, 4)
}

function masteredOf(week: Week, subject: Subject): string[] {
  return subject.nodes.filter((node) => node.weekId === week.id && node.status === 'mastered').map((node) => node.title)
}

/**
 * The last three earlier weeks are enough to keep continuity without turning
 * the prompt into a transcript. Only one sentence of each gate is needed.
 */
export function buildWeekBrief(
  subject: Subject,
  week: Week,
  journey: Journey,
  capacity: { active: number; passive: number },
  now = Date.now(),
): WeekBrief {
  const blueprint = blueprintFor(subject.id, week.weekNumber)
  const earlier = subject.weeks
    .filter((entry) => entry.weekNumber < week.weekNumber)
    .sort((a, b) => b.weekNumber - a.weekNumber)
    .slice(0, 3)
    .reverse()

  const history: BriefHistory[] = earlier.map((entry) => ({
    weekNumber: entry.weekNumber,
    title: entry.title,
    project: blueprintFor(subject.id, entry.weekNumber)?.project ?? entry.capstone ?? '',
    gate: clip(gateLine(entry, subject), 220),
    mastered: masteredOf(entry, subject),
    failures: failurePointsOf(entry, subject),
  }))

  const mastered = subject.nodes
    .filter((node) => node.status === 'mastered')
    .map((node) => clip(node.title, 80))
    .slice(0, 24)

  const failures = subject.nodes
    .flatMap((node) =>
      node.knowledgePoints
        .filter((point) => point.fails > 0)
        .map((point) => clip(`${node.title}: ${point.failureMode}`, 160)),
    )
    .slice(0, 12)

  const day = courseDay(journey, now)

  return {
    subjectId: subject.id,
    courseDay: day,
    courseWeek: day === null ? null : courseWeek(day),
    week: {
      weekNumber: week.weekNumber,
      title: week.title,
      anchor: clip(week.anchor, 400),
      outcomes: week.outcomes.map((outcome) => clip(outcome, 180)),
      project: blueprint?.project ?? week.capstone ?? '',
      git: blueprint?.git ?? '',
      checkpoint: clip(gateLine(week, subject, false), 240),
      theme: blueprint?.theme ?? week.title,
      design: blueprint?.design ?? '',
      terms: [...(blueprint?.termsIntroduced ?? [])],
      days: [...(blueprint?.days ?? [])],
      knowledgePoints: (blueprint?.knowledgePoints ?? []).map((point) => ({
        primitive: point.primitive,
        concept: point.concept,
        failureMode: point.failureMode,
      })),
      checklist: week.checklist
        .filter((item) => item.day !== undefined)
        .sort((a, b) => (a.day ?? 0) - (b.day ?? 0))
        .map((item) => ({
          slot: item.day ?? 1,
          mode: item.context,
          label: clip(item.label, 180),
          minutes: estimateOf(item).max,
        })),
    },
    history,
    mastered,
    failures,
    capacity,
  }
}

function listOrNone(items: string[], fallback: string): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : `- ${fallback}`
}

/** The exact prompt sent to the model. Tests assert on its sections. */
export function buildGenerationPrompt(brief: WeekBrief): string {
  const { week } = brief
  const checklistByDay = new Map<number, BriefChecklistItem[]>()
  for (const item of week.checklist) {
    const list = checklistByDay.get(item.slot) ?? []
    list.push(item)
    checklistByDay.set(item.slot, list)
  }
  const checklistLines = [1, 2, 3, 4, 5, 6, 7]
    .map((slot) => {
      const items = checklistByDay.get(slot) ?? []
      if (items.length === 0) return `Day ${slot}: (buffer day, no required task)`
      return `Day ${slot}:\n${items
        .map((item) => `  - [${item.mode}, ${item.minutes} min] ${item.label}`)
        .join('\n')}`
    })
    .join('\n')

  const historyLines =
    brief.history.length > 0
      ? brief.history
          .map(
            (entry) =>
              `Week ${entry.weekNumber}, ${entry.title}\n  Artefact: ${entry.project || 'not recorded'}\n  Checkpoint: ${entry.gate}\n  Mastered: ${entry.mastered.join('; ') || 'nothing yet'}\n  Failures seen: ${entry.failures.join('; ') || 'none recorded'}`,
          )
          .join('\n\n')
      : 'This is the first week of the course. There is no earlier work.'

  const days = week.days
    .map((focus, index) => `Day ${index + 1}: ${focus}`)
    .join('\n')

  const knowledge = week.knowledgePoints
    .map((point) => `- ${point.primitive} → ${point.concept}. Failure to prevent: ${point.failureMode}`)
    .join('\n')

  return `You write one week of SkillMastery, a 168-day apprenticeship in Dart, Flutter and interface design.

The learner is 13. He reads on an Android phone, often while distracted. He has a laptop with Zed and the Flutter CLI.

## The week (fixed, do not change it)

Week ${week.weekNumber}: ${week.title}
Theme: ${week.theme}
Anchor: ${week.anchor}
Artefact to build this week: ${week.project}
Git habit: ${week.git}
Closed-book checkpoint: ${week.checkpoint}
Design thread: ${week.design}
Terms this week introduces: ${week.terms.join(', ') || 'none listed'}

Outcomes:
${listOrNone(week.outcomes, 'none recorded')}

Knowledge points (use these; do not invent a different syllabus):
${knowledge || '- none recorded'}

Day focus from the blueprint:
${days || '- no day focus recorded'}

## The learner's history

${historyLines}

Mastered nodes so far: ${brief.mastered.join('; ') || 'none'}
Failure modes already seen: ${brief.failures.join('; ') || 'none'}

Weekly capacity: ${brief.capacity.active} active minutes and ${brief.capacity.passive} passive minutes. Keep each day inside its share. Do not add work the learner cannot fit.

## The evidence checklist (the learner checks these, so match them)

${checklistLines}

## The job

Write seven day cards, one per day slot. Each card explains the day. The checklist above is the evidence; do not pretend a card earns credit.

Rules:
- Teach exactly the week above. Do not spend a day on next week's topic.
- Use the learner's history. Name a failure he already met when it applies.
- Every day pairs passive input with active output.
- Day 7 is the checkpoint and the buffer. Do not add new material there.
- Do not mention timers, streaks, being behind, or time remaining.
- Tasks in a card must match the checklist for that slot. 2–4 steps, the first startable in under five minutes.
- Resources must be real documentation URLs from dart.dev, docs.flutter.dev, api.flutter.dev, docs.github.com or pub.dev. Do not invent a URL.

${STYLE_CONTRACT}

## Output

Return JSON only. No prose before or after. No code fence.

{
  "days": [
    {
      "day": 1,
      "title": "8 words or fewer",
      "summary": "250–500 words, paragraphs separated by a blank line",
      "tasks": ["2–4 steps, 20 words or fewer each"],
      "direction": "40 words or fewer",
      "designNote": "25–100 words",
      "estMinutes": 80,
      "resources": [{ "label": "Dart language tour", "url": "https://dart.dev/language", "kind": "docs" }]
    }
  ]
}

Use all seven days exactly once. Keep every summary inside the word budget. Write British spelling.`
}

export type GenerationErrorCode = 'empty' | 'json' | 'shape'

export class GenerationError extends Error {
  code: GenerationErrorCode

  constructor(code: GenerationErrorCode, message: string) {
    super(message)
    this.name = 'GenerationError'
    this.code = code
  }
}

export interface ParsedGenerationOptions {
  model?: string
  generatedAt?: number
}

const RESOURCE_KINDS = new Set(['docs', 'curriculum', 'article'])

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function asStringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, max)
}

/** Strip a code fence and any chatter around the JSON object. */
export function extractJson(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1]!.trim() : trimmed
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new GenerationError('json', 'The answer did not contain a JSON object.')
  }
  return body.slice(start, end + 1)
}

export function parseWeekGeneration(text: string, options: ParsedGenerationOptions = {}): DayPlan[] {
  if (!text.trim()) throw new GenerationError('empty', 'The model returned an empty answer.')
  let payload: unknown
  try {
    payload = JSON.parse(extractJson(text))
  } catch (error) {
    if (error instanceof GenerationError) throw error
    throw new GenerationError('json', 'The answer was not valid JSON.')
  }
  if (!payload || typeof payload !== 'object' || !('days' in payload)) {
    throw new GenerationError('shape', 'The answer has no days array.')
  }
  const rawDays = (payload as { days?: unknown }).days
  if (!Array.isArray(rawDays) || rawDays.length !== 7) {
    throw new GenerationError(
      'shape',
      `The answer has ${Array.isArray(rawDays) ? rawDays.length : 0} day cards. A week needs seven.`,
    )
  }

  const seen = new Set<number>()
  const plans = rawDays.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new GenerationError('shape', `Day card ${index + 1} is not an object.`)
    }
    const raw = entry as Record<string, unknown>
    const day = typeof raw.day === 'number' ? Math.round(raw.day) : Number.NaN
    if (!(day >= 1 && day <= 7)) {
      throw new GenerationError('shape', `Day card ${index + 1} has no valid day slot.`)
    }
    if (seen.has(day)) {
      throw new GenerationError('shape', `Two day cards claim day ${day}.`)
    }
    seen.add(day)

    const title = asString(raw.title)
    const summary = asString(raw.summary)
    const direction = asString(raw.direction)
    const designNote = asString(raw.designNote)
    if (!title || !summary || !direction || !designNote) {
      throw new GenerationError('shape', `Day ${day} is missing a title, summary, direction or design note.`)
    }

    const resources = Array.isArray(raw.resources)
      ? raw.resources
          .filter((resource): resource is Record<string, unknown> => Boolean(resource) && typeof resource === 'object')
          .map((resource) => {
            const kind = asString(resource.kind, 'docs')
            return {
              label: asString(resource.label),
              url: asString(resource.url) || undefined,
              kind: (RESOURCE_KINDS.has(kind) ? kind : 'docs') as DayPlan['resources'][number]['kind'],
            }
          })
          .filter((resource) => resource.label.length > 0)
          .slice(0, 4)
      : []

    if (resources.length === 0) {
      throw new GenerationError('shape', `Day ${day} has no resources. Each card needs at least one resource.`)
    }

    const estMinutes =
      typeof raw.estMinutes === 'number' && Number.isFinite(raw.estMinutes)
        ? Math.max(5, Math.min(240, Math.round(raw.estMinutes)))
        : 60

    return {
      day: day as DayPlan['day'],
      title,
      summary,
      tasks: asStringList(raw.tasks, 4),
      direction,
      designNote,
      resources,
      estMinutes,
      origin: 'ai' as const,
      ...(options.model ? { model: options.model } : {}),
      ...(options.generatedAt ? { generatedAt: options.generatedAt } : {}),
    }
  })

  // Check for duplicate titles across all cards
  if (hasDuplicateTitles(plans)) {
    throw new GenerationError('shape', 'Two or more day cards have the same title. Each card needs a unique title.')
  }

  return plans.sort((a, b) => a.day - b.day)
}

function hasDuplicateTitles(plans: DayPlan[]): boolean {
  const titles = new Set<string>()
  for (const plan of plans) {
    if (titles.has(plan.title.toLowerCase())) {
      return true
    }
    titles.add(plan.title.toLowerCase())
  }
  return false
}

const TIME_PRESSURE = /\b(timer|stopwatch|streak|behind schedule|time remaining|countdown)\b/i
const FORWARD_REFERENCE = /\b(?:next|following|later) week\b|\bweek (\d{1,2})\b/gi

/**
 * A card may name its own week ("the rest of Week 1 builds on this file"), so
 * only a pointer at a different week counts as drift.
 */
function pointsAtAnotherWeek(text: string, ownWeek: number): boolean {
  for (const match of text.matchAll(FORWARD_REFERENCE)) {
    if (match[1] === undefined) return true
    if (Number(match[1]) !== ownWeek) return true
  }
  return false
}

function artefactWords(project: string): string[] {
  return project
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 5 && !['build', 'using', 'with', 'from', 'that', 'this'].includes(word))
}

/**
 * Advisory checks the prose checker cannot make. Each flag names a concrete
 * problem, so the learner can decide before the cards become canonical.
 */
export function driftFlags(brief: WeekBrief, plans: DayPlan[]): string[] {
  const flags: string[] = []
  const all = plans.map((plan) => `${plan.title}\n${plan.summary}\n${plan.tasks.join('\n')}`).join('\n')

  if (TIME_PRESSURE.test(all)) {
    flags.push('The draft mentions a timer, a streak or being behind. Remove that pressure before saving.')
  }
  if (pointsAtAnotherWeek(all, brief.week.weekNumber)) {
    flags.push('The draft points at another week. A day card should teach its own day.')
  }

  const words = artefactWords(brief.week.project)
  if (words.length > 0 && !words.some((word) => all.toLowerCase().includes(word))) {
    flags.push(`The draft never names the week's artefact: ${brief.week.project}.`)
  }

  const expectedMinutes = plans.reduce((total, plan) => total + plan.estMinutes, 0)
  const weekly = brief.capacity.active + brief.capacity.passive
  if (weekly > 0 && expectedMinutes > weekly * 1.1) {
    flags.push(
      `The cards plan ${expectedMinutes} min against a ${weekly} min week. Lower the estimates or cut a step.`,
    )
  }

  return flags
}

/** The week's checklist compared with the card tasks, for the preview panel. */
export function coverageGaps(brief: WeekBrief, plans: DayPlan[]): string[] {
  const gaps: string[] = []
  for (const plan of plans) {
    const items = brief.week.checklist.filter((item) => item.slot === plan.day)
    if (items.length === 0) continue
    if (plan.tasks.length === 0) {
      gaps.push(`Day ${plan.day} has a checklist but the card has no steps.`)
      continue
    }
    if (items.length > 0 && plan.tasks.length > items.length + 2) {
      gaps.push(`Day ${plan.day} asks for ${plan.tasks.length} steps against ${items.length} checklist tasks.`)
    }
  }
  return gaps
}

/** Convenience for the panel: the brief from the live store shape. */
export function briefFromStore(
  subject: Subject,
  week: Week,
  journey: Journey,
  capacity: { active: number; passive: number },
  now = Date.now(),
): WeekBrief {
  return buildWeekBrief(subject, week, journey, capacity, now)
}
