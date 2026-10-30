import { describe, expect, it } from 'vitest'
import { weekOneDayPlans } from './week1'
import { createSeedData } from '../seedData'
import { checkDayPlans, sentences, wordCount } from '../../content/style'
import { DAY_SLOTS } from '../../engine/estimates'

const seed = createSeedData()
const week = seed.subjects.find((subject) => subject.id === 'flutter')!.weeks.find(
  (entry) => entry.id === 'fl-w1',
)!

describe('Week 1 day cards', () => {
  it('passes the prose standard', () => {
    expect(checkDayPlans(weekOneDayPlans)).toEqual([])
  })

  it('covers every day slot exactly once and keeps the card order', () => {
    expect(weekOneDayPlans.map((plan) => plan.day)).toEqual(DAY_SLOTS)
    expect(weekOneDayPlans.every((plan) => plan.origin === 'authored')).toBe(true)
  })

  it('carries a plan that fits the checklist day it describes', () => {
    for (const slot of DAY_SLOTS) {
      const plan = weekOneDayPlans.find((entry) => entry.day === slot)!
      const items = week.checklist.filter((item) => item.day === slot)
      expect(items.length, `day ${slot} has checklist tasks`).toBeGreaterThan(0)
      const planned = items.reduce((total, item) => total + (item.estimate?.max ?? item.minutes ?? 0), 0)
      expect(plan.estMinutes).toBeLessThanOrEqual(110)
      expect(plan.estMinutes).toBeGreaterThanOrEqual(Math.round(planned * 0.7))
    }
  })

  it('shows a real resource link on every card', () => {
    for (const plan of weekOneDayPlans) {
      expect(plan.resources.length).toBeGreaterThan(0)
      for (const resource of plan.resources) {
        expect(resource.url).toMatch(/^https:\/\//)
        expect(resource.kind === 'docs' || resource.kind === 'article').toBe(true)
      }
    }
  })

  it('opens with one visible paragraph a 13-year-old can read in one go', () => {
    for (const plan of weekOneDayPlans) {
      const first = plan.summary.split('\n\n')[0]!
      expect(wordCount(first)).toBeLessThanOrEqual(60)
      expect(sentences(first).length).toBeLessThanOrEqual(3)
    }
  })
})
