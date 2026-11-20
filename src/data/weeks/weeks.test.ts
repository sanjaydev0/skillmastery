import { describe, expect, it } from 'vitest'
import { FLUTTER_BLUEPRINT, blueprintFor } from '../curriculum/blueprint'
import { DAY_SLOTS } from '../../engine/estimates'
import { estimateForMinutes } from '../../engine/estimates'
import { checkDayPlans, paragraphs, sentences, wordCount } from '../../content/style'
import { createSeedData } from '../seedData'
import { flutterFoundation } from '../tracks/flutterWeeks1to6'
import { flutterArchitecture } from '../tracks/flutterWeeks7to12'
import { flutterSystems } from '../tracks/flutterWeeks13to24'
import { WEEK_CONTENT, authoredDayPlans } from '.'

const seed = createSeedData()
const plansByWeek = authoredDayPlans()
const baseIds = new Set([
  ...flutterFoundation.cards.map((card) => card.id),
  ...flutterArchitecture.cards.map((card) => card.id),
  ...flutterSystems.cards.map((card) => card.id),
  ...flutterFoundation.resources.map((resource) => resource.id),
  ...flutterArchitecture.resources.map((resource) => resource.id),
  ...flutterSystems.resources.map((resource) => resource.id),
])

function allowedHost(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return (
      /^(?:[\w-]+\.)?dart\.dev$/.test(host) ||
      /^(?:[\w-]+\.)?flutter\.dev$/.test(host) ||
      /^(?:[\w-]+\.)?github\.com$/.test(host) ||
      host === 'pub.dev'
    )
  } catch {
    return false
  }
}

describe('authored week modules', () => {
  it('maps every module to one real blueprint week', () => {
    const numbers = WEEK_CONTENT.map((content) => content.weekNumber)
    expect(new Set(numbers).size).toBe(numbers.length)
    for (const content of WEEK_CONTENT) {
      expect(content.weekNumber).toBeGreaterThanOrEqual(1)
      expect(content.weekNumber).toBeLessThanOrEqual(24)
      expect(content.weekId).toBe(`fl-w${content.weekNumber}`)
      expect(FLUTTER_BLUEPRINT.some((week) => week.weekNumber === content.weekNumber)).toBe(true)
    }
    // Week 1 is the shipped exemplar even before any later week is authored.
    expect(numbers).toContain(1)
  })

  it('ships seven authored cards in day order with the prose standard', () => {
    for (const content of WEEK_CONTENT) {
      const plans = plansByWeek[content.weekId] ?? []
      expect(plans, `week ${content.weekNumber} card count`).toHaveLength(7)
      expect(plans.map((plan) => plan.day)).toEqual(DAY_SLOTS)
      expect(plans.every((plan) => plan.origin === 'authored')).toBe(true)
      expect(
        checkDayPlans(plans, [...(blueprintFor('flutter', content.weekNumber)?.termsIntroduced ?? [])]),
        `week ${content.weekNumber} prose`,
      ).toEqual([])
    }
  })

  it('uses one real documentation link per card', () => {
    for (const content of WEEK_CONTENT) {
      for (const plan of plansByWeek[content.weekId] ?? []) {
        expect(plan.resources.length, `week ${content.weekNumber} day ${plan.day}`).toBeGreaterThan(0)
        for (const resource of plan.resources) {
          expect(resource.url, `week ${content.weekNumber} day ${plan.day} ${resource.label}`).toMatch(/^https:\/\//)
          expect(allowedHost(resource.url ?? ''), `host of ${resource.url}`).toBe(true)
        }
      }
    }
  })

  it('opens each card with a paragraph a 13-year-old can read in one go', () => {
    for (const content of WEEK_CONTENT) {
      for (const plan of plansByWeek[content.weekId] ?? []) {
        const first = paragraphs(plan.summary)[0] ?? ''
        expect(wordCount(first), `week ${content.weekNumber} day ${plan.day}`).toBeLessThanOrEqual(60)
        expect(sentences(first).length, `week ${content.weekNumber} day ${plan.day}`).toBeLessThanOrEqual(3)
      }
    }
  })

  it('keeps each card inside its checklist day and capacity', () => {
    for (const content of WEEK_CONTENT) {
      const target = seed.subjects[0]!.weeks.find((entry) => entry.id === content.weekId)
      expect(target, `week ${content.weekNumber} exists in the seed`).toBeDefined()
      if (!target) continue
      for (const plan of plansByWeek[content.weekId] ?? []) {
        const items = target.checklist.filter((item) => item.day === plan.day)
        const planned = items.reduce((total, item) => total + (item.estimate?.max ?? 0), 0)
        expect(plan.estMinutes, `week ${content.weekNumber} day ${plan.day} upper bound`).toBeLessThanOrEqual(110)
        expect(plan.estMinutes, `week ${content.weekNumber} day ${plan.day} lower bound`).toBeGreaterThanOrEqual(
          Math.round(planned * 0.7),
        )
      }
    }
  })

  it('keeps a checklist override complete and inside the weekly budget', () => {
    for (const content of WEEK_CONTENT) {
      if (!content.checklist) continue
      const ids = content.checklist.map((item) => item.id)
      expect(new Set(ids).size, `week ${content.weekNumber} checklist ids`).toBe(ids.length)
      for (const id of ids) expect(id).toMatch(new RegExp(`^${content.weekId}-`))

      let active = 0
      let passive = 0
      for (const slot of DAY_SLOTS) {
        const items = content.checklist.filter((item) => item.day === slot)
        expect(items.length, `week ${content.weekNumber} day ${slot} checklist`).toBeGreaterThan(0)
        let dayActive = 0
        let dayPassive = 0
        for (const item of items) {
          const max = estimateForMinutes(item.minutes).max
          if (item.context === 'active') {
            active += max
            dayActive += max
          } else {
            passive += max
            dayPassive += max
          }
        }
        expect(dayActive, `week ${content.weekNumber} day ${slot} active`).toBeLessThanOrEqual(103)
        expect(dayPassive, `week ${content.weekNumber} day ${slot} passive`).toBeLessThanOrEqual(60)
      }
      expect(active, `week ${content.weekNumber} active total`).toBeLessThanOrEqual(720)
      expect(passive, `week ${content.weekNumber} passive total`).toBeLessThanOrEqual(420)
    }
  })

  it('never points the learner at a future week', () => {
    for (const content of WEEK_CONTENT) {
      for (const plan of plansByWeek[content.weekId] ?? []) {
        const text = [plan.title, plan.summary, ...plan.tasks, plan.direction, plan.designNote].join('\n')
        for (const match of text.matchAll(/\bweek\s+(\d{1,2})\b/gi)) {
          expect(Number(match[1]), `week ${content.weekNumber} day ${plan.day}`).toBeLessThanOrEqual(
            content.weekNumber,
          )
        }
      }
    }
  })

  it('does not reuse an id from the canonical track', () => {
    for (const content of WEEK_CONTENT) {
      for (const resource of content.resources ?? []) {
        expect(baseIds.has(resource.id), `resource id ${resource.id}`).toBe(false)
      }
      for (const card of content.cards ?? []) {
        expect(baseIds.has(card.id), `card id ${card.id}`).toBe(false)
      }
    }
  })
})
