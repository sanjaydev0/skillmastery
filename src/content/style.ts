import type { DayPlan } from '../types/schema'

/**
 * The executable half of `docs/CONTENT-STYLE.md`.
 *
 * These checks catch the cheap mistakes — filler, long sentences, missing
 * budgets — so a human review can spend its attention on the expensive ones:
 * whether the idea is true, the example is real and the check is observable.
 */

export type ProseCode =
  | 'filler'
  | 'long-sentence'
  | 'long-paragraph'
  | 'title-long'
  | 'summary-length'
  | 'task-count'
  | 'task-long'
  | 'task-punctuation'
  | 'task-future'
  | 'direction-long'
  | 'design-note-length'
  | 'day-order'

export interface ProseIssue {
  field: string
  code: ProseCode
  message: string
  excerpt?: string
}

/** Words that add heat and no information. Keep this list short and honest. */
const FILLER: Array<{ pattern: RegExp; word: string }> = [
  { pattern: /\bsimply\b/i, word: 'simply' },
  { pattern: /\bjust\b/i, word: 'just' },
  { pattern: /\bobviously\b/i, word: 'obviously' },
  { pattern: /\bof course\b/i, word: 'of course' },
  { pattern: /\beas(?:y|ily)\b/i, word: 'easy' },
  { pattern: /\bbasically\b/i, word: 'basically' },
  { pattern: /\bactually\b/i, word: 'actually' },
  { pattern: /\breally\b/i, word: 'really' },
  { pattern: /\bvery\b/i, word: 'very' },
  { pattern: /\bstuff\b/i, word: 'stuff' },
  { pattern: /\bthings?\b/i, word: 'thing' },
  { pattern: /\betc\.?\b/i, word: 'etc.' },
  { pattern: /\band so on\b/i, word: 'and so on' },
  { pattern: /\bleverage\b/i, word: 'leverage' },
  { pattern: /\butili[sz]e\b/i, word: 'utilize' },
  { pattern: /\brobust\b/i, word: 'robust' },
  { pattern: /\bseamless\b/i, word: 'seamless' },
  { pattern: /\bpowerful\b/i, word: 'powerful' },
  { pattern: /\bmodern\b/i, word: 'modern' },
  { pattern: /\bbest practice\b/i, word: 'best practice' },
  { pattern: /\bunder the hood\b/i, word: 'under the hood' },
  { pattern: /\bmagic\b/i, word: 'magic' },
]

export const TITLE_MAX_WORDS = 8
export const SUMMARY_MIN_WORDS = 250
export const SUMMARY_MAX_WORDS = 500
export const SENTENCE_MAX_WORDS = 25
export const INSTRUCTION_MAX_WORDS = 20
export const PARAGRAPH_MAX_SENTENCES = 5
export const TASK_MIN = 2
export const TASK_MAX = 4
export const DIRECTION_MAX_WORDS = 40
export const DESIGN_NOTE_MIN_WORDS = 25
export const DESIGN_NOTE_MAX_WORDS = 100

export function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length
}

/**
 * Split on sentence punctuation that is followed by a space. A decimal or a
 * version number stays inside its sentence because it has no space after the
 * stop. A new sentence may start with a code word such as `final`, which is
 * still a sentence in learner prose.
 */
export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

export function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function excerpt(text: string, max = 90): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`
}

function fillerIssues(field: string, text: string): ProseIssue[] {
  const issues: ProseIssue[] = []
  for (const { pattern, word } of FILLER) {
    if (!pattern.test(text)) continue
    issues.push({
      field,
      code: 'filler',
      message: `Drop “${word}”. It adds heat, not information.`,
      excerpt: excerpt(text),
    })
  }
  return issues
}

function sentenceIssues(field: string, text: string, maxWords: number): ProseIssue[] {
  return sentences(text)
    .filter((sentence) => wordCount(sentence) > maxWords)
    .map((sentence) => ({
      field,
      code: 'long-sentence' as const,
      message: `Split this sentence: ${wordCount(sentence)} words, cap is ${maxWords}.`,
      excerpt: excerpt(sentence),
    }))
}

function paragraphIssues(field: string, text: string): ProseIssue[] {
  return paragraphs(text)
    .filter((paragraph) => sentences(paragraph).length > PARAGRAPH_MAX_SENTENCES)
    .map((paragraph) => ({
      field,
      code: 'long-paragraph' as const,
      message: `Split this paragraph: more than ${PARAGRAPH_MAX_SENTENCES} sentences.`,
      excerpt: excerpt(paragraph),
    }))
}

/** A step the learner performs. Imperative, short, one action. */
export function checkInstruction(field: string, text: string): ProseIssue[] {
  const issues = [...fillerIssues(field, text), ...sentenceIssues(field, text, INSTRUCTION_MAX_WORDS)]
  if (/[;—]/.test(text)) {
    issues.push({
      field,
      code: 'task-punctuation',
      message: 'Use a full stop instead of a semicolon or an em dash in a step.',
      excerpt: excerpt(text),
    })
  }
  if (/\bwill\b/i.test(text)) {
    issues.push({
      field,
      code: 'task-future',
      message: 'Write the step in the present tense. Remove “will”.',
      excerpt: excerpt(text),
    })
  }
  return issues
}

/** Prose that explains a mechanism. */
export function checkExplanation(field: string, text: string): ProseIssue[] {
  return [
    ...fillerIssues(field, text),
    ...sentenceIssues(field, text, SENTENCE_MAX_WORDS),
    ...paragraphIssues(field, text),
  ]
}

export function checkDayPlan(plan: DayPlan): ProseIssue[] {
  const issues: ProseIssue[] = []

  const titleWords = wordCount(plan.title)
  if (titleWords > TITLE_MAX_WORDS) {
    issues.push({
      field: 'title',
      code: 'title-long',
      message: `Title is ${titleWords} words. Cap is ${TITLE_MAX_WORDS}.`,
      excerpt: excerpt(plan.title),
    })
  }

  const summaryWords = wordCount(plan.summary)
  if (summaryWords < SUMMARY_MIN_WORDS || summaryWords > SUMMARY_MAX_WORDS) {
    issues.push({
      field: 'summary',
      code: 'summary-length',
      message: `Summary is ${summaryWords} words. Target is ${SUMMARY_MIN_WORDS}–${SUMMARY_MAX_WORDS}.`,
    })
  }
  issues.push(...checkExplanation('summary', plan.summary))

  if (plan.tasks.length < TASK_MIN || plan.tasks.length > TASK_MAX) {
    issues.push({
      field: 'tasks',
      code: 'task-count',
      message: `${plan.tasks.length} tasks. Use ${TASK_MIN}–${TASK_MAX}.`,
    })
  }
  for (const [index, task] of plan.tasks.entries()) {
    issues.push(...checkInstruction(`tasks[${index}]`, task))
    if (wordCount(task) > INSTRUCTION_MAX_WORDS) {
      issues.push({
        field: `tasks[${index}]`,
        code: 'task-long',
        message: `Task is ${wordCount(task)} words. Cap is ${INSTRUCTION_MAX_WORDS}.`,
        excerpt: excerpt(task),
      })
    }
  }

  const directionWords = wordCount(plan.direction)
  if (directionWords === 0 || directionWords > DIRECTION_MAX_WORDS) {
    issues.push({
      field: 'direction',
      code: 'direction-long',
      message:
        directionWords === 0
          ? 'Direction is empty. Name the detour this day prevents.'
          : `Direction is ${directionWords} words. Cap is ${DIRECTION_MAX_WORDS}.`,
    })
  }
  issues.push(...checkInstruction('direction', plan.direction))

  const noteWords = wordCount(plan.designNote)
  if (noteWords < DESIGN_NOTE_MIN_WORDS || noteWords > DESIGN_NOTE_MAX_WORDS) {
    issues.push({
      field: 'designNote',
      code: 'design-note-length',
      message: `Design note is ${noteWords} words. Target is ${DESIGN_NOTE_MIN_WORDS}–${DESIGN_NOTE_MAX_WORDS}.`,
    })
  }
  issues.push(...checkExplanation('designNote', plan.designNote))

  return issues
}

/** One week must carry exactly one card per slot, in order. */
export function checkDayPlans(plans: DayPlan[]): ProseIssue[] {
  if (plans.length !== 7) {
    return [
      {
        field: 'day',
        code: 'day-order',
        message: `A week needs seven cards. This draft has ${plans.length}.`,
      },
    ]
  }
  const days = plans.map((plan) => plan.day).sort((a, b) => a - b)
  if (days.some((day, index) => day !== index + 1)) {
    return [
      {
        field: 'day',
        code: 'day-order',
        message: 'Each day 1–7 needs exactly one card.',
      },
    ]
  }
  return plans.flatMap((plan) => checkDayPlan(plan))
}

/**
 * Verbatim block for every generation prompt. It restates the rules the model
 * must follow; the checker above is what proves it did.
 */
export const STYLE_CONTRACT = `Write in plain course English.

Audience: a 13-year-old reading on a phone, once, possibly while distracted.

One idea per day card. If a card teaches two things, split it.

Field budgets:
- title: 8 words or fewer.
- summary: 250–500 words, in three paragraphs: what you can do, the mechanism with one real example, the failure this prevents and its fix.
- tasks: 2–4 steps, 20 words or fewer each. The first step starts in under five minutes. The last step is a check the learner can see: an output, an error, a pixel count or a test name.
- direction: 40 words or fewer. Name the tempting wrong move and its cost. "Do this, not that."
- designNote: 25–100 words. One claim about this week's artefact, then one before/after example.

Rules:
- Instructions are imperative, active and present tense. One action per sentence.
- Explanation sentences are 25 words or fewer. Paragraphs are five sentences or fewer.
- Define a term on first use in plain words. Then use the same word every time. Use the week's term list; do not invent synonyms.
- One concrete example per abstract claim. Use a number, a name or an output.
- Name the failure and the fix. A warning without a fix is noise.
- No forward references. Do not say "you will need this later".
- No filler: simply, just, obviously, of course, easy, basically, actually, really, very, stuff, things, etc., and so on, leverage, utilize, robust, seamless, powerful, modern, best practice, under the hood, magic.
- No idioms or metaphor in a step. A metaphor may open a design note, but the example must follow at once.
- At most two choices: one default path and, at most, one extension.
- Give a stop point: "Stop after step 3. The rest is tomorrow." This is a scope limit, not a timer.
- British spelling. Digits for counts. A space before a unit: 45 min.
- Keep real technical names. No baby-talk and no "magic".

Never mention timers, streaks, being behind, or time remaining.`
