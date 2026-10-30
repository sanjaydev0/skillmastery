import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { weekOneDayPlans } from '../data/dayPlans/week1'
import { createSeedData } from '../data/seedData'
import { buildWeekBrief } from '../engine/generation'
import type { Subject } from '../types/schema'
import { clearAiKey, setAiKey } from './ai'
import { cancelGeneration, generateWeekFor, isGenerating } from './generateWeek'

const seed = createSeedData()
const subject = seed.subjects.find((entry) => entry.id === 'flutter') as Subject
const weekOne = subject.weeks.find((entry) => entry.weekNumber === 1)!
const journey = { ...seed.journey, startedAt: Date.UTC(2026, 9, 1, 12) }
const brief = buildWeekBrief(subject, weekOne, journey, { active: 720, passive: 420 })

function answer(): string {
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

function reply(content: string) {
  return { ok: true, status: 200, json: async () => ({ content }) }
}

beforeEach(() => {
  setAiKey('test-key-not-real')
})

afterEach(() => {
  cancelGeneration()
  clearAiKey()
  vi.unstubAllGlobals()
})

describe('generateWeekFor', () => {
  it('returns a draft with no blocking issues and never saves it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(answer()))
    vi.stubGlobal('fetch', fetchMock)

    const result = await generateWeekFor(brief)
    expect(result.plans).toHaveLength(7)
    expect(result.issues).toEqual([])
    expect(result.flags).toEqual([])
    expect(result.gaps).toEqual([])
    expect(result.model).toBe('deepseek/deepseek-v4.1-flash-1017')
    expect(isGenerating()).toBe(false)

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string)
    expect(body.max_tokens).toBe(8000)
    expect(body.messages[0].content).toContain('Return JSON only')
  })

  it('keeps a draft that breaks the prose standard, and reports why', async () => {
    const payload = JSON.parse(answer())
    payload.days[0].summary = 'Too short.'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(JSON.stringify(payload))))

    const result = await generateWeekFor(brief)
    expect(result.plans).toHaveLength(7)
    expect(result.issues.some((issue) => issue.code === 'summary-length')).toBe(true)
  })

  it('refuses a second week while one is in flight', async () => {
    let release: (() => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            release = () => resolve(reply(answer()))
          }),
      ),
    )

    const first = generateWeekFor(brief)
    expect(isGenerating('flutter:1')).toBe(true)
    await expect(generateWeekFor(brief)).rejects.toMatchObject({ code: 'busy' })
    release!()
    await first
    expect(isGenerating()).toBe(false)
  })

  it('cancels the request and settles the promise', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => {
              const error = new Error('aborted')
              error.name = 'AbortError'
              reject(error)
            })
          }),
      ),
    )

    const pending = generateWeekFor(brief)
    cancelGeneration()
    await expect(pending).rejects.toMatchObject({ code: 'aborted' })
    expect(isGenerating()).toBe(false)
  })

  it('needs a key before it spends anything', async () => {
    clearAiKey()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(generateWeekFor(brief)).rejects.toMatchObject({ code: 'missing-key' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
