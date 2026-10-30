import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAppStore } from '../../store/AppStore'
import { ProgressView } from './ProgressView'

function checkFirstTask(): void {
  const state = useAppStore.getState()
  const subject = state.subjects.find((entry) => entry.id === state.activeSubjectId)!
  const week = subject.weeks[0]!
  week.checklist[0] = { ...week.checklist[0]!, done: true, doneAt: Date.now() }
}

describe('progress marks', () => {
  it('shows marks when the game layer is on', () => {
    checkFirstTask()
    render(<ProgressView />)
    expect(screen.getByRole('heading', { name: 'Marks' })).toBeInTheDocument()
    expect(screen.getByText('One real task')).toBeInTheDocument()
    expect(screen.getByText(/No mark counts days/)).toBeInTheDocument()
  })

  it('hides marks when the game layer is off', () => {
    const state = useAppStore.getState()
    useAppStore.setState({ journey: { ...state.journey, gameLayer: false } })
    render(<ProgressView />)
    expect(screen.queryByRole('heading', { name: 'Marks' })).not.toBeInTheDocument()
  })
})
