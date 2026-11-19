import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Subject } from '../../types/schema'
import { createSeedData } from '../../data/seedData'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { WeekSheet } from './WeekSheet'
import { GATE_QUESTIONS } from '../../engine/proofs'

function activeSubject(): Subject {
  const state = useAppStore.getState()
  return state.subjects.find((entry) => entry.id === state.activeSubjectId)!
}

function week() {
  return activeSubject().weeks[0]!
}

beforeEach(() => {
  useUiStore.setState({ toasts: [] })
  useAppStore.setState({ ...createSeedData(), hydrated: true })
})

describe('the checkpoint', () => {
  it('clears the week only when all four answers are yes', () => {
    const target = week()
    expect(
      useAppStore.getState().saveGate(target.id, {
        explain: true,
        build: true,
        finish: true,
        debug: false,
      }).ok,
    ).toBe(true)
    expect(activeSubject().weeks[0]!.gate.passedAt).toBeUndefined()

    const result = useAppStore.getState().saveGate(target.id, {
      explain: true,
      build: true,
      finish: true,
      debug: true,
    })
    expect(result.message).toMatch(/Week 2 unlocked/)
    expect(activeSubject().weeks[0]!.gate.passedAt).toBeTypeOf('number')
  })

  it('keeps every attempt, newest last', () => {
    const target = week()
    useAppStore.getState().saveGate(target.id, {
      explain: false,
      build: false,
      finish: false,
      debug: false,
    })
    useAppStore.getState().saveGate(target.id, {
      explain: true,
      build: true,
      finish: true,
      debug: true,
    })
    const attempts = activeSubject().weeks[0]!.gate.attempts
    expect(attempts).toHaveLength(2)
    expect(attempts[0]!.passed).toBe(false)
    expect(attempts[1]!.passed).toBe(true)
  })

  it('asks four switches instead of five numeric sliders', () => {
    render(<WeekSheet weekId={week().id} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mastery gate' }))

    const switches = screen.getAllByRole('switch')
    expect(switches).toHaveLength(4)
    for (const question of GATE_QUESTIONS) {
      expect(screen.getByRole('switch', { name: question.label })).toHaveAttribute(
        'aria-checked',
        'false',
      )
    }

    for (const question of GATE_QUESTIONS) {
      fireEvent.click(screen.getByRole('switch', { name: question.label }))
    }
    expect(screen.getByText('4 of 4 answered')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Save gate attempt' }))
    expect(activeSubject().weeks[0]!.gate.passedAt).toBeTypeOf('number')
  })
})
