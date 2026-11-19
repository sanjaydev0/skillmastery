import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Subject } from '../../types/schema'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { startOfLocalDay } from '../../lib/courseClock'
import { dayProofFor } from '../../engine/proofs'
import { gameStatsFor, XP } from '../../engine/gamification'
import { TodayView } from './TodayView'

function activeSubject(): Subject {
  const state = useAppStore.getState()
  return state.subjects.find((entry) => entry.id === state.activeSubjectId)!
}

function journey() {
  return useAppStore.getState().journey
}

function startToday(): void {
  const state = useAppStore.getState()
  const startedAt = startOfLocalDay(Date.now())
  useAppStore.setState({
    journey: { ...state.journey, startedAt, onboardedAt: startedAt, gameLayer: true },
  })
}

beforeEach(() => {
  useUiStore.setState({ toasts: [] })
  startToday()
  const subject = activeSubject()
  subject.dayProofs = []
  subject.weeks[0]!.checklist = subject.weeks[0]!.checklist.map((item) => ({
    ...item,
    done: false,
    doneAt: undefined,
  }))
})

describe('day proof', () => {
  it('records a cold day proof and pays 40 XP once', () => {
    const before = gameStatsFor(activeSubject(), journey()).xp
    const week = activeSubject().weeks[0]!

    const result = useAppStore.getState().saveDayProof(week.id, 1, 'cold')
    expect(result.ok).toBe(true)
    expect(dayProofFor(activeSubject(), week.id, 1)?.outcome).toBe('cold')
    expect(gameStatsFor(activeSubject(), journey()).xp - before).toBe(XP.proof)

    useAppStore.getState().saveDayProof(week.id, 1, 'cold')
    expect(gameStatsFor(activeSubject(), journey()).xp - before).toBe(XP.proof)
  })

  it('does not pay for a proof with notes', () => {
    const before = gameStatsFor(activeSubject(), journey()).xp
    const week = activeSubject().weeks[0]!
    useAppStore.getState().saveDayProof(week.id, 2, 'warm')
    expect(gameStatsFor(activeSubject(), journey()).xp).toBe(before)
  })

  it('shows the three honest answers on Today', () => {
    render(<TodayView />)
    const card = screen.getByRole('region', { name: "Today's proof" })
    expect(card).toHaveTextContent('Without notes')
    expect(card).toHaveTextContent('With notes')
    expect(card).toHaveTextContent('Not yet')
  })

  it('marks the proof stale when a task changes after it was saved', () => {
    const week = activeSubject().weeks[0]!
    useAppStore.getState().saveDayProof(week.id, 1, 'cold')
    // Move the saved proof into the past so the next check is provably newer.
    const subject = activeSubject()
    subject.dayProofs = subject.dayProofs.map((proof) => ({ ...proof, at: Date.now() - 10_000 }))

    const item = week.checklist.find((entry) => entry.day === 1)!
    useAppStore.getState().toggleChecklist(week.id, item.id)

    render(<TodayView />)
    expect(screen.getByText(/tasks changed since you proved this/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Prove it again/i }))
    expect(dayProofFor(activeSubject(), week.id, 1)).toBeUndefined()
  })
})
