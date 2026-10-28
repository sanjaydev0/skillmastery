import { describe, expect, it } from 'vitest'
import { schemaWeekday, weekdayOf } from './dates'

describe('weekday helpers', () => {
  it('keeps the schema Sunday-first order separate from display order', () => {
    const wednesday = new Date(2026, 9, 28)
    const sunday = new Date(2026, 9, 25)
    expect(schemaWeekday(wednesday)).toBe(3)
    expect(schemaWeekday(sunday)).toBe(0)
    // The display helper is Monday-first, so Sunday is the last slot.
    expect(weekdayOf(wednesday)).toBe(2)
    expect(weekdayOf(sunday)).toBe(6)
  })
})
