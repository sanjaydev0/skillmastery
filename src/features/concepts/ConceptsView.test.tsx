import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Subject } from '../../types/schema'
import { createSeedData } from '../../data/seedData'
import { useAppStore } from '../../store/AppStore'
import { ConceptsView } from './ConceptsView'

function activeSubject(): Subject {
  const state = useAppStore.getState()
  return state.subjects.find((entry) => entry.id === state.activeSubjectId)!
}

beforeEach(() => {
  useAppStore.setState({ ...createSeedData(), hydrated: true })
})

describe('concept index', () => {
  it('lists concepts by week', () => {
    const first = activeSubject().concepts.find((concept) => concept.weekNumber === 1)!
    render(<ConceptsView />)
    expect(screen.getByRole('heading', { name: 'Concepts' })).toBeInTheDocument()
    expect(screen.getAllByText(first.term).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Week 1/).length).toBeGreaterThan(0)
  })

  it('shows an honest empty state for a week with no concepts', () => {
    const subject = activeSubject()
    subject.concepts = subject.concepts.filter((concept) => concept.weekNumber !== 3)
    render(<ConceptsView />)
    expect(screen.getByText('No concepts recorded for this week yet.')).toBeInTheDocument()
  })

  it('filters to the concepts due today', () => {
    const subject = activeSubject()
    const concept = subject.concepts.find((entry) => entry.weekNumber === 2)!
    subject.concepts = subject.concepts.map((entry) =>
      entry.id === concept.id
        ? {
            ...entry,
            checks: [{ at: Date.now() - 5 * 86_400_000, outcome: 'cold' as const }],
            step: 0,
            dueAt: Date.now() - 86_400_000,
          }
        : entry,
    )
    render(<ConceptsView />)
    expect(screen.getAllByText(concept.term).length).toBeGreaterThan(0)
  })
})
