import { describe, expect, it } from 'vitest'
import type { DayPlan, Subject } from '../types/schema'
import { createSeedData } from '../data/seedData'
import { weekOneDayPlans } from '../data/dayPlans/week1'
import { checkDayPlans } from '../content/style'
import { DAY_SLOTS } from './estimates'
import {
  GENERATION_MAX_TOKENS,
  GENERATION_PROMPT_MAX_CHARS,
  GenerationError,
  buildGenerationPrompt,
  buildWeekBrief,
  driftFlags,
  extractJson,
  parseWeekGeneration,
} from './generation'

const seed = createSeedData()
const subject = seed.subjects.find((entry) => entry.id === 'flutter') as Subject
const weekOne = subject.weeks.find((entry) => entry.weekNumber === 1)!
const weekTwo = subject.weeks.find((entry) => entry.weekNumber === 2)!
const journey = { ...seed.journey, startedAt: Date.UTC(2026, 9, 1, 12) }
const capacity = { active: 720, passive: 420 }

function fixture(): string {
  return JSON.stringify({
    days: weekOneDayPlans.map((plan) => ({
      day: plan.day,
      title: plan.title,
      summary: plan.summary,
      tasks: plan.tasks,
      direction: plan.direction,
      designNote: plan.designNote,
      estMinutes: plan.estMinutes,
      resources: plan.resources,
    })),
  })
}

describe('week brief', () => {
  it('carries the earlier week gate, artefact and mastered nodes', () => {
    const earlier = subject.weeks.find((entry) => entry.weekNumber === 1)!
    const node = subject.nodes.find((entry) => entry.weekId === earlier.id)!
    node.status = 'mastered'
    node.knowledgePoints[0] = { ...node.knowledgePoints[0]!, fails: 2 }
    earlier.gate.attempts.push({
      at: journey.startedAt!,
      scores: { concept: 4, implementation: 4, craft: 4, debugging: 4 },
      average: 4,
      passed: true,
    })

    const brief = buildWeekBrief(subject, weekTwo, journey, capacity)
    expect(brief.week.weekNumber).toBe(2)
    expect(brief.history.map((entry) => entry.weekNumber)).toContain(1)
    const first = brief.history.find((entry) => entry.weekNumber === 1)!
    expect(first.gate).toMatch(/5|passed/)
    expect(first.mastered).toContain(node.title)
    expect(first.failures.join(' ')).toContain(node.knowledgePoints[0]!.failureMode)
    expect(brief.mastered).toContain(node.title)
    expect(brief.failures.join(' ')).toContain(node.knowledgePoints[0]!.failureMode)
  })

  it('lists the checklist against its day slot, not a weekday', () => {
    const brief = buildWeekBrief(subject, weekOne, journey, capacity)
    expect(brief.week.checklist.length).toBeGreaterThan(0)
    expect(new Set(brief.week.checklist.map((item) => item.slot))).toEqual(new Set(DAY_SLOTS))
    expect(brief.capacity).toEqual(capacity)
  })
})

describe('generation prompt', () => {
  const brief = buildWeekBrief(subject, weekOne, journey, capacity)
  const prompt = buildGenerationPrompt(brief)

  it('states the week, the artefact and the style contract', () => {
    expect(prompt).toContain('Week 1')
    expect(prompt).toContain(brief.week.project)
    expect(prompt).toContain('Write in plain course English.')
    expect(prompt).toContain('Return JSON only')
  })

  it('quotes the checklist so a card cannot invent evidence', () => {
    const label = brief.week.checklist[0]!.label
    expect(prompt).toContain(label)
    expect(prompt).toContain('active')
  })

  it('stays well inside the transport guard', () => {
    expect(prompt.length).toBeLessThan(GENERATION_PROMPT_MAX_CHARS)
    expect(GENERATION_MAX_TOKENS).toBe(8000)
  })
})

describe('parseWeekGeneration', () => {
  it('accepts the authored week as valid JSON and keeps all seven slots', () => {
    const plans = parseWeekGeneration(fixture(), { model: 'test-model', generatedAt: 42 })
    expect(plans.map((plan) => plan.day)).toEqual(DAY_SLOTS)
    expect(plans.every((plan) => plan.origin === 'ai')).toBe(true)
    expect(plans[0]!.model).toBe('test-model')
    expect(checkDayPlans(plans)).toEqual([])
  })

  it('strips a code fence and surrounding chatter', () => {
    const fenced = `Here is the week:\n\`\`\`json\n${fixture()}\n\`\`\`\nGood luck.`
    expect(extractJson(fenced).startsWith('{')).toBe(true)
    expect(parseWeekGeneration(fenced)).toHaveLength(7)
  })

  it('rejects a week that is one card short', () => {
    const payload = JSON.parse(fixture())
    payload.days.pop()
    expect(() => parseWeekGeneration(JSON.stringify(payload))).toThrow(GenerationError)
    expect(() => parseWeekGeneration(JSON.stringify(payload))).toThrow(/seven/)
  })

  it('rejects two cards on the same slot', () => {
    const payload = JSON.parse(fixture())
    payload.days[1].day = 1
    expect(() => parseWeekGeneration(JSON.stringify(payload))).toThrow(/Two day cards/)
  })

  it('rejects an empty answer and prose without a JSON object', () => {
    expect(() => parseWeekGeneration('   ')).toThrow(/empty/)
    expect(() => parseWeekGeneration('I cannot write that.')).toThrow(/JSON/)
  })

  it('clamps an estimate that leaves the sane range', () => {
    const payload = JSON.parse(fixture())
    payload.days[0].estMinutes = 9_000
    const plans = parseWeekGeneration(JSON.stringify(payload))
    expect(plans[0]!.estMinutes).toBe(240)
  })

  it('drops an unknown resource kind and keeps the label', () => {
    const payload = JSON.parse(fixture())
    payload.days[0].resources = [{ label: 'Dart tour', url: 'https://dart.dev/language', kind: 'video' }]
    const plans = parseWeekGeneration(JSON.stringify(payload))
    expect(plans[0]!.resources[0]!.kind).toBe('docs')
  })
})

describe('driftFlags', () => {
  const brief = buildWeekBrief(subject, weekOne, journey, capacity)
  const base = weekOneDayPlans

  it('says nothing about the authored week', () => {
    expect(driftFlags(brief, base)).toEqual([])
  })

  it('flags timer pressure and a forward reference', () => {
    const withTimer = base.map((plan, index) =>
      index === 2 ? { ...plan, summary: `${plan.summary}\n\nKeep an eye on the timer.` } : plan,
    )
    expect(driftFlags(brief, withTimer).join(' ')).toMatch(/timer/)

    const withNextWeek = base.map((plan, index) =>
      index === 4 ? { ...plan, summary: `${plan.summary}\n\nWe cover lists next week.` } : plan,
    )
    expect(driftFlags(brief, withNextWeek).join(' ')).toMatch(/another week/)
  })

  it('flags a draft that never names the artefact', () => {
    const sanitised: DayPlan[] = base.map((plan) => ({
      ...plan,
      title: 'A lesson',
      summary: 'A plain explanation with enough words to stay plausible. It keeps going.',
      tasks: ['Open the file.'],
      direction: 'Do the work.',
      designNote: 'One number owns the screen.',
    }))
    expect(driftFlags(brief, sanitised).join(' ')).toMatch(/never names the week's artefact/)
    expect(driftFlags(brief, sanitised).join(' ')).toMatch(/never names the week's checkpoint/)
  })

  it('flags cards that plan more minutes than the week allows', () => {
    const heavy = base.map((plan) => ({ ...plan, estMinutes: 200 }))
    expect(driftFlags(brief, heavy).join(' ')).toMatch(/min against a 1140 min week/)
  })
})
