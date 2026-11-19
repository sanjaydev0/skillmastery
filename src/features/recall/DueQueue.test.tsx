import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Subject } from '../../types/schema'
import { createSeedData } from '../../data/seedData'
import { useAppStore } from '../../store/AppStore'
import { RecallView } from './RecallView'

const DAY_MS = 86_400_000

function activeSubject(): Subject {
  const state = useAppStore.getState()
  return state.subjects.find((entry) => entry.id === state.activeSubjectId)!
}

function setConceptDue(term: string, dueAt: number): void {
  const subject = activeSubject()
  useAppStore.setState({
    subjects: useAppStore.getState().subjects.map((entry) =>
      entry.id !== subject.id
        ? entry
        : {
            ...entry,
            concepts: entry.concepts.map((concept) =>
              concept.term === term
                ? {
                    ...concept,
                    checks: [{ at: Date.now() - 5 * DAY_MS, outcome: 'cold' as const }],
                    step: 0,
                    dueAt,
                  }
                : concept,
            ),
          },
    ),
  })
}

beforeEach(() => {
  useAppStore.setState({ ...createSeedData(), hydrated: true })
})

describe('the one due queue', () => {
  it('puts a due concept beside the due cards', () => {
    const concept = activeSubject().concepts[0]!
    setConceptDue(concept.term, Date.now() - DAY_MS)
    render(<RecallView />)
    expect(screen.getByRole('heading', { name: 'Due today' })).toBeInTheDocument()
    expect(screen.getByText(concept.term)).toBeInTheDocument()
  })

  it('does not include a concept that is not due', () => {
    const concept = activeSubject().concepts[0]!
    setConceptDue(concept.term, Date.now() + 7 * DAY_MS)
    render(<RecallView />)
    expect(screen.queryByRole('heading', { name: 'Due today' })).not.toBeInTheDocument()
    expect(screen.queryByText(concept.term)).not.toBeInTheDocument()
  })
})
