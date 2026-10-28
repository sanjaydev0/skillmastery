import { describe, expect, it } from 'vitest'
import type { DayPlan } from '../types/schema'
import {
  STYLE_CONTRACT,
  checkDayPlan,
  checkDayPlans,
  checkExplanation,
  checkInstruction,
  sentences,
  wordCount,
} from './style'

/**
 * A card written to the standard. It doubles as the reference shape for the
 * authored Week 1 content.
 */
const goodPlan: DayPlan = {
  day: 1,
  title: 'What a variable points at',
  summary: `You can already run a Dart file. Today you learn what a variable is, so later mistakes stop looking mysterious. The lesson is short, and every later week depends on it.

A variable in Dart is a name that points at an object. The object lives in memory. The name is the binding.

When you write var tea = 'chai', the name tea points at the text 'chai'. When you write final cup = tea, cup points at the same text. final locks the name, not the object. This matters when the object can change.

With final list = [1, 2], the call list.add(3) works, because the name still points at the same list. const is stronger. const list = [1, 2] freezes the whole value before the program runs, so add cannot be called at all. The compiler also reuses one identical const value, so two const lists with the same contents are the same object.

Here is the failure this prevents. A learner writes final total = 0, then tries total = total + 5 and gets a compile error.

The fix is not to delete final. The fix is to decide what changes. If the number changes, use var total = 0. If the list changes but the name must not, keep final and call add. If nothing changes, use const.

Read your own program and answer one question: does the name change, the object change, or neither? That question is the whole day. Read the error text before you change the code. The error names the line and the rule.`,
  resources: [],
  tasks: [
    'Open bin/ledger.dart and write one var, one final and one const.',
    'Run dart run bin/ledger.dart.',
    'Add 3 to the final list and run the file again.',
    'Write the const error in your notes.',
  ],
  direction:
    'Do not delete final to silence the error. Decide what changes: the name, the object, or nothing. Then choose var, final or const.',
  designNote:
    'Your receipt has one primary number. Make the total the largest text on the card, at least twice the size of the tax line. Keep the tax muted and small. If both numbers are 24px, the eye has no anchor and the reader has to search.',
  estMinutes: 90,
  origin: 'authored',
}

function withSummary(summary: string): DayPlan {
  return { ...goodPlan, summary }
}

describe('prose checks', () => {
  it('counts words and splits sentences without breaking decimals', () => {
    expect(wordCount('  one two three  ')).toBe(3)
    expect(sentences('One. Two point 3.5 stays. Three!')).toEqual([
      'One.',
      'Two point 3.5 stays.',
      'Three!',
    ])
  })

  it('flags filler in an instruction', () => {
    const issues = checkInstruction('tasks[0]', 'Simply open the file and just run it.')
    expect(issues.some((issue) => issue.code === 'filler')).toBe(true)
    expect(issues.map((issue) => issue.message).join(' ')).toContain('simply')
  })

  it('flags a step that joins two actions with a semicolon', () => {
    const issues = checkInstruction('tasks[1]', 'Open the file; run the test.')
    expect(issues.some((issue) => issue.code === 'task-punctuation')).toBe(true)
  })

  it('flags future tense in a step', () => {
    const issues = checkInstruction('tasks[2]', 'The program will print three lines.')
    expect(issues.some((issue) => issue.code === 'task-future')).toBe(true)
  })

  it('flags a sentence over the explanation cap', () => {
    const long = `${'word '.repeat(26).trim()}.`
    expect(checkExplanation('summary', long).some((issue) => issue.code === 'long-sentence')).toBe(true)
  })

  it('flags a paragraph over five sentences', () => {
    const paragraph = 'One. Two. Three. Four. Five. Six.'
    expect(checkExplanation('summary', paragraph).some((issue) => issue.code === 'long-paragraph')).toBe(
      true,
    )
  })
})

describe('day card checks', () => {
  it('passes a card written to the standard', () => {
    expect(wordCount(goodPlan.summary)).toBeGreaterThanOrEqual(250)
    expect(checkDayPlan(goodPlan)).toEqual([])
  })

  it('flags a summary outside the budget', () => {
    const issues = checkDayPlan(withSummary('Too short.'))
    expect(issues.some((issue) => issue.code === 'summary-length')).toBe(true)
  })

  it('flags a title over eight words', () => {
    const issues = checkDayPlan({ ...goodPlan, title: 'One two three four five six seven eight nine' })
    expect(issues.some((issue) => issue.code === 'title-long')).toBe(true)
  })

  it('flags too many tasks and a task over the cap', () => {
    const tooMany = checkDayPlan({
      ...goodPlan,
      tasks: ['One.', 'Two.', 'Three.', 'Four.', 'Five.'],
    })
    expect(tooMany.some((issue) => issue.code === 'task-count')).toBe(true)

    const longTask = checkDayPlan({
      ...goodPlan,
      tasks: ['Open the file and write one var, one final and one const binding before you run anything at all on your own.'],
    })
    expect(longTask.some((issue) => issue.code === 'task-long')).toBe(true)
  })

  it('flags an empty direction and a short design note', () => {
    const issues = checkDayPlan({ ...goodPlan, direction: '', designNote: 'Make it clear.' })
    expect(issues.some((issue) => issue.code === 'direction-long')).toBe(true)
    expect(issues.some((issue) => issue.code === 'design-note-length')).toBe(true)
  })

  it('requires seven ordered cards for a week', () => {
    expect(checkDayPlans([goodPlan]).some((issue) => issue.code === 'day-order')).toBe(true)
    const seven = Array.from({ length: 7 }, (_, index) => ({ ...goodPlan, day: (index + 1) as DayPlan['day'] }))
    expect(checkDayPlans(seven)).toEqual([])
    const duplicate = seven.map((plan, index) => (index === 6 ? { ...plan, day: 6 as DayPlan['day'] } : plan))
    expect(checkDayPlans(duplicate).some((issue) => issue.code === 'day-order')).toBe(true)
  })
})

describe('generation contract', () => {
  it('states the same caps the checker enforces', () => {
    expect(STYLE_CONTRACT).toContain('8 words or fewer')
    expect(STYLE_CONTRACT).toContain('250–500')
    expect(STYLE_CONTRACT).toContain('20 words or fewer')
    expect(STYLE_CONTRACT).toContain('25 words or fewer')
    expect(STYLE_CONTRACT).toContain('British spelling')
    expect(STYLE_CONTRACT).toContain('No forward references')
  })

  it('is short enough to sit inside every generation prompt', () => {
    expect(wordCount(STYLE_CONTRACT)).toBeLessThan(450)
  })
})
