import type { DayPlan } from '../types/schema'
import { checkDayPlans, type ProseIssue } from '../content/style'
import {
  GENERATION_MAX_TOKENS,
  GENERATION_PROMPT_MAX_CHARS,
  buildGenerationPrompt,
  coverageGaps,
  driftFlags,
  parseWeekGeneration,
  type WeekBrief,
} from '../engine/generation'
import { AI_MODEL, AiError, runAi } from './ai'

/**
 * One week, one request.
 *
 * A generated week is a draft until the learner saves it, so this service never
 * touches the store. It runs the prompt, parses the answer and reports the
 * issues the prose checker found. Saving is a separate, explicit action.
 */

export interface GenerateWeekResult {
  plans: DayPlan[]
  /** Blocking issues: the cards do not meet the style standard. */
  issues: ProseIssue[]
  /** Advisory drift the checker cannot see, such as a forward reference. */
  flags: string[]
  /** Day cards that do not line up with the checklist for their slot. */
  gaps: string[]
  model: string
  generatedAt: number
}

let active: { weekId: string; controller: AbortController } | null = null

export function isGenerating(weekId?: string): boolean {
  if (!active) return false
  return weekId === undefined || active.weekId === weekId
}

export function cancelGeneration(): void {
  active?.controller.abort()
  active = null
}

export async function generateWeekFor(brief: WeekBrief): Promise<GenerateWeekResult> {
  if (active) {
    throw new AiError('busy', 'A week is already being written. Wait for it, or cancel it first.')
  }

  const weekId = `${brief.subjectId}:${brief.week.weekNumber}`
  const controller = new AbortController()
  active = { weekId, controller }

  try {
    const prompt = buildGenerationPrompt(brief)
    const { content } = await runAi(prompt, {
      maxTokens: GENERATION_MAX_TOKENS,
      maxPromptChars: GENERATION_PROMPT_MAX_CHARS,
      signal: controller.signal,
    })
    const generatedAt = Date.now()
    const plans = parseWeekGeneration(content, { model: AI_MODEL, generatedAt })
    return {
      plans,
      issues: checkDayPlans(plans, brief.week.terms),
      flags: driftFlags(brief, plans),
      gaps: coverageGaps(brief, plans),
      model: AI_MODEL,
      generatedAt,
    }
  } finally {
    if (active?.controller === controller) active = null
  }
}
