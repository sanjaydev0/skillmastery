import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { DayPlan } from '../../types/schema'
import { useAppStore } from '../../store/AppStore'
import { PlanView } from './PlanView'
import { PlanWeekPage } from './PlanWeekPage'

describe('syllabus and threads', () => {
  it('lists all three threads in the plan syllabus', () => {
    render(<PlanView />)
    expect(screen.getByText('Every week across Dart, Flutter and design')).toBeInTheDocument()
    expect(screen.getByText(/Every week across/).closest('summary')).toBeInTheDocument()
    // Week 1's design thread, quoted from the blueprint rather than hard-coded.
    expect(screen.getAllByText(/One number owns the screen/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Bindings, final vs const/).length).toBeGreaterThan(0)
  })

  it('marks each week with the state of its cards', () => {
    render(<PlanView />)
    expect(screen.getAllByText('Written', { selector: '.badge' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Outline', { selector: '.badge' }).length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Generated', { selector: '.badge' })).toHaveLength(0)
  })

  it('calls a week with saved cards Generated', () => {
    const plans: DayPlan[] = Array.from({ length: 7 }, (_, index) => ({
      day: (index + 1) as DayPlan['day'],
      title: `Day ${index + 1}`,
      summary: 'A plain summary for this slot.',
      resources: [],
      tasks: ['Do the step.'],
      direction: 'Do this, not that.',
      designNote: 'One number owns the screen.',
      estMinutes: 60,
      origin: 'ai' as const,
    }))
    expect(useAppStore.getState().saveDayPlans('fl-w2', plans, 'ai').ok).toBe(true)
    render(<PlanView />)
    expect(screen.getAllByText('Generated', { selector: '.badge' }).length).toBeGreaterThan(0)
  })

  it('marks the current week in the rail', () => {
    render(<PlanView />)
    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.length).toBeGreaterThan(0)
  })

  it('shows the three threads and the new terms on a week page', () => {
    render(<PlanWeekPage weekId="fl-w1" />)
    expect(screen.getByRole('heading', { name: 'Dart, Flutter and design' })).toBeInTheDocument()
    expect(screen.getByText('Dart', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('Flutter', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('Design', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('guard clause')).toBeInTheDocument()
  })
})
