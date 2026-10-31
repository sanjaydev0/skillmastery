import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { startOfLocalDay } from '../../lib/courseClock'
import { TodayView } from './TodayView'
import { ProgressView } from '../progress/ProgressView'
import type { Subject } from '../../types/schema'

function activeSubject(): Subject {
  const state = useAppStore.getState()
  return state.subjects.find((entry) => entry.id === state.activeSubjectId)!
}

function startToday(): void {
  const state = useAppStore.getState()
  const startedAt = startOfLocalDay(Date.now())
  useAppStore.setState({
    journey: { ...state.journey, startedAt, onboardedAt: startedAt, gameLayer: true },
  })
}

function clearChecklist(): void {
  const subject = activeSubject()
  subject.weeks[0]!.checklist = subject.weeks[0]!.checklist.map((item) => ({
    ...item,
    done: false,
    doneAt: undefined,
  }))
}

/** Nine passive tasks today is 90 XP: one more checked task crosses level 1. */
function primeNinety(): void {
  const subject = activeSubject()
  const week = subject.weeks[0]!
  let marked = 0
  week.checklist = week.checklist.map((item) => {
    if (marked >= 9 || item.day === 1) return item
    marked++
    return { ...item, done: true, doneAt: Date.now(), context: 'passive' as const }
  })
  expect(marked).toBe(9)
}

beforeEach(() => {
  useUiStore.setState({ toasts: [] })
  startToday()
  clearChecklist()
})

describe('game layer on Today', () => {
  it('shows the level strip once there is XP', () => {
    primeNinety()
    render(<TodayView />)
    const strip = screen.getByRole('region', { name: 'Your level' })
    expect(strip).toHaveTextContent('Level 0')
    expect(strip).toHaveTextContent('XP today')
  })

  it('hides the strip when the game layer is off', () => {
    primeNinety()
    const state = useAppStore.getState()
    useAppStore.setState({ journey: { ...state.journey, gameLayer: false } })
    render(<TodayView />)
    expect(screen.queryByRole('region', { name: 'Your level' })).not.toBeInTheDocument()
  })

  it('announces a level up when a task crosses a threshold', () => {
    primeNinety()
    render(<TodayView />)
    fireEvent.click(screen.getAllByRole('checkbox')[0]!)
    const messages = useUiStore.getState().toasts.map((toast) => toast.message)
    expect(messages.some((message) => /^Level 1: Apprentice\.$/.test(message))).toBe(true)
  })
})

describe('game layer on Progress', () => {
  it('marks quests as XP already earned rather than a second reward', () => {
    primeNinety()
    render(<ProgressView />)
    expect(screen.getByText(/marks XP already inside your total/)).toBeInTheDocument()
    expect(screen.getAllByText(/^Worth \d+ XP$/).length).toBeGreaterThan(0)
  })
})
