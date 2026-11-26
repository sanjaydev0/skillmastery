import { describe, expect, it } from 'vitest'
import { parseHash } from './router'

describe('hash routes', () => {
  it('keeps the daily views and the legacy aliases', () => {
    expect(parseHash('#/practice').view).toBe('practice')
    expect(parseHash('#/recall').view).toBe('practice')
    expect(parseHash('#/today').view).toBe('today')
  })

  it('reads a quick-recall count from the query only for practice', () => {
    expect(parseHash('#/practice?quick=5')).toEqual({ view: 'practice', quick: 5 })
    expect(parseHash('#/practice?quick=999').quick).toBe(20)
    expect(parseHash('#/today?quick=5')).toEqual({ view: 'today' })
    expect(parseHash('#/practice?quick=0')).toEqual({ view: 'practice' })
    expect(parseHash('#/practice?quick=abc')).toEqual({ view: 'practice' })
  })
})
