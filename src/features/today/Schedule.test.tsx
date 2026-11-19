import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Subject } from '../../types/schema'
import { createSeedData } from '../../data/seedData'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { startOfLocalDay } from '../../lib/courseClock'
import { TodayView } from './TodayView'

function activeSubject(): Subject {
  const state = useAppStore.getState()
  return state.subjects.find((entry) => entry.id === state.activeSubjectId)!
}

function startOn(daysAgo: number): void {
  const state = useAppStore.getState()
  useAppStore.setState({
    journey: {
      ...state.journey,
      startedAt: startOfLocalDay(Date.now() - daysAgo * 86_400_000),
      onboardedAt: startOfLocalDay(Date.now()),
    },
  })
}

function proveDay(day: 1 | 2 | 3 | 4 | 5 | 6 | 7): void {
  const week = activeSubject().weeks[0]!
  useAppStore.getState().saveDayProof(week.id, day, 'cold')
}

beforeEach(() => {
  useUiStore.setState({ toasts: [] })
  useAppStore.setState({ ...createSeedData(), hydrated: true })
})

describe('the honest schedule', () => {
  it('shows the drift only when the calendar is more than two days ahead', () => {
    startOn(10)
    proveDay(1)
    render(<TodayView />)
    expect(screen.getByText('The calendar says Day 11. Your record says Day 1.')).toBeInTheDocument()
  })

  it('says so when the record has no days yet', () => {
    startOn(10)
    render(<TodayView />)
    expect(
      screen.getByText('The calendar says Day 11. Your record has no days yet.'),
    ).toBeInTheDocument()
  })

  it('stays quiet when the record keeps up', () => {
    startOn(1)
    proveDay(1)
    render(<TodayView />)
    expect(screen.queryByText(/The calendar says/)).not.toBeInTheDocument()
  })

  it('hides the drift while the course is paused', () => {
    startOn(10)
    const state = useAppStore.getState()
    useAppStore.setState({
      journey: {
        ...state.journey,
        pauses: [{ from: Date.now() - 2 * 86_400_000, to: null }],
      },
    })
    render(<TodayView />)
    expect(screen.queryByText(/The calendar says/)).not.toBeInTheDocument()
  })
})

describe('the weekly review note', () => {
  it('saves one note per week', () => {
    const weekId = activeSubject().weeks[0]!.id
    expect(useAppStore.getState().saveWeekReview(weekId, 'Null checks are still slow for me.').ok).toBe(true)
    useAppStore.getState().saveWeekReview(weekId, 'I can rebuild the counter without notes.')
    const week = activeSubject().weeks[0]!
    expect(week.review?.note).toBe('I can rebuild the counter without notes.')
    expect(week.review?.at).toBeTypeOf('number')
  })

  it('clears the note when it is blank', () => {
    const weekId = activeSubject().weeks[0]!.id
    useAppStore.getState().saveWeekReview(weekId, 'Something')
    useAppStore.getState().saveWeekReview(weekId, '   ')
    expect(activeSubject().weeks[0]!.review).toBeUndefined()
  })
})
