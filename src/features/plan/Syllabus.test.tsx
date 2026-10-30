import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
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

  it('shows the three threads and the new terms on a week page', () => {
    render(<PlanWeekPage weekId="fl-w1" />)
    expect(screen.getByRole('heading', { name: 'Dart, Flutter and design' })).toBeInTheDocument()
    expect(screen.getByText('Dart', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('Flutter', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('Design', { selector: 'dt' })).toBeInTheDocument()
    expect(screen.getByText('guard clause')).toBeInTheDocument()
  })
})
