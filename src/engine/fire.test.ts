import { describe, expect, it } from 'vitest'
import { DAY_MS } from '../lib/dates'
import { emptySrs, explicitReview, fireCredit, strengthLabel } from './fire'

const AT = 1_700_000_000_000

describe('FIRe', () => {
  it('grants fractional credit, extends the interval, and records the fire timestamp', () => {
    const first = fireCredit(emptySrs(), AT)
    expect(first.credited).toBe(true)
    expect(first.srs.strength).toBe(0.5)
    expect(first.srs.intervalDays).toBe(2)
    expect(first.srs.dueAt).toBe(AT + 2 * DAY_MS)
    expect(first.srs.implicitReviews).toBe(1)
    expect(first.srs.lastFireAt).toBe(AT)
  })

  it('is idempotent inside the 12-hour cooldown', () => {
    const first = fireCredit(emptySrs(), AT)
    const tooSoon = fireCredit(first.srs, AT + 11 * 60 * 60 * 1000)
    expect(tooSoon.credited).toBe(false)
    expect(tooSoon.srs).toEqual(first.srs)
  })

  it('applies again after the cooldown and caps strength at five', () => {
    const first = fireCredit(emptySrs(), AT)
    const second = fireCredit(first.srs, AT + 12 * 60 * 60 * 1000)
    expect(second.credited).toBe(true)
    expect(second.srs.strength).toBe(1)
    expect(second.srs.implicitReviews).toBe(2)

    const strong = { ...second.srs, strength: 4.9, intervalDays: 100 }
    const capped = fireCredit(strong, AT + 48 * 60 * 60 * 1000)
    expect(capped.srs.strength).toBe(5)
    expect(capped.srs.intervalDays).toBe(120)
  })

  it('never changes mastery: it only returns SRS state', () => {
    const result = fireCredit(emptySrs(), AT)
    expect(result).not.toHaveProperty('status')
  })
})

describe('explicit node review', () => {
  it('advances strength and uses the 1/3/7/14/30/60/120-day ladder', () => {
    const one = explicitReview(emptySrs(), AT)
    expect(one.strength).toBe(1)
    expect(one.intervalDays).toBe(1)
    expect(one.dueAt).toBe(AT + DAY_MS)
    expect(one.lastReviewedAt).toBe(AT)

    const two = explicitReview(one, AT + DAY_MS)
    expect(two.strength).toBe(2)
    expect(two.intervalDays).toBe(3)
  })

  it('caps strength and interval', () => {
    const five = { ...emptySrs(), strength: 5, intervalDays: 120 }
    const next = explicitReview(five, AT)
    expect(next.strength).toBe(5)
    expect(next.intervalDays).toBe(120)
  })

  it('labels strength consistently', () => {
    expect(strengthLabel(0)).toBe('Untested')
    expect(strengthLabel(1)).toBe('Fragile')
    expect(strengthLabel(1.5)).toBe('Developing')
    expect(strengthLabel(3)).toBe('Solid')
    expect(strengthLabel(4.5)).toBe('Mastered')
  })
})
