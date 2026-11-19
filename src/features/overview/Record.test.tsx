import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createSeedData } from '../../data/seedData'
import { useAppStore } from '../../store/AppStore'
import { OverviewView } from './OverviewView'

beforeEach(() => {
  useAppStore.setState({ ...createSeedData(), hydrated: true })
})

describe('the record book', () => {
  it('shows recorded days, not a streak', () => {
    render(<OverviewView />)
    expect(screen.getAllByText(/days recorded/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument()
  })

  it('counts a recorded day without inventing a second score', () => {
    useAppStore.getState().toggleDailyItem('canon')

    render(<OverviewView />)
    expect(screen.getByRole('heading', { name: /1\s*of 7 days recorded/i })).toBeInTheDocument()
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument()
  })
})
