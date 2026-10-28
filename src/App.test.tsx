import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'

describe('application smoke tests', () => {
  it('renders Today with the active seed week and day plan', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getAllByText(/Dart types, sound null safety/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Today' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: "Today's plan" })).toBeInTheDocument()
    expect(screen.getByText(/credits its full estimate range/i)).toBeInTheDocument()
  })

  it('opens settings, switches theme, and closes accessibly', async () => {
    render(<App />)
    const buttons = screen.getAllByRole('button', { name: 'Open settings' })
    fireEvent.click(buttons[0]!)
    const dialog = await screen.findByRole('dialog', { name: 'Settings' })
    expect(within(dialog).getByText('Appearance')).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: 'Install app' })).toBeInTheDocument()
    expect(within(dialog).getByText(/Android Chrome/)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: /Light/ }))
    expect(localStorage.getItem('skillmastery:theme')).toBe('light')
    expect(within(dialog).getByRole('button', { name: /Light/ })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close panel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument())
  })

  it('opens the command palette, searches, and closes with Escape', async () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const palette = await screen.findByRole('dialog', { name: 'Command palette' })
    const input = within(palette).getByLabelText('Search everything')
    fireEvent.change(input, { target: { value: 'null safety' } })
    await waitFor(() => expect(within(palette).getAllByRole('option').length).toBeGreaterThan(2))
    expect(within(palette).getAllByText(/Sound null safety/i).length).toBeGreaterThan(0)

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument())
  })

  it('navigates with the hash router', async () => {
    render(<App />)
    window.location.hash = '#/practice'
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(await screen.findByRole('heading', { name: 'Practice' })).toBeInTheDocument()
    expect(screen.getByText(/SRS queue/i)).toBeInTheDocument()
  })

  it('renders a week as seven day cards', async () => {
    render(<App />)
    window.location.hash = '#/plan/fl-w1'
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(await screen.findByRole('heading', { name: /Dart types, sound null safety/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Seven-day plan' })).toBeInTheDocument()
    expect(screen.getAllByText(/Day 1 · Monday/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/estimated range, no timer/).length).toBe(7)
  })

  it('credits a completed task to week totals and undoes it from the keyboard', async () => {
    render(<App />)
    window.location.hash = '#/plan/fl-w1'
    fireEvent(window, new HashChangeEvent('hashchange'))
    await screen.findByRole('heading', { name: 'Seven-day plan' })

    const totals = screen.getByRole('region', { name: 'Week totals' })
    expect(within(totals).getByText('0 min')).toBeInTheDocument()

    const firstTask = screen.getAllByRole('checkbox')[0]!
    expect(firstTask).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(firstTask)
    expect(firstTask).toHaveAttribute('aria-checked', 'true')
    expect(within(totals).getByText('60–75 min')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    await waitFor(() =>
      expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-checked', 'false'),
    )
    expect(within(totals).getByText('0 min')).toBeInTheDocument()
    expect(await screen.findByText(/Undid: Toggle task/)).toBeInTheDocument()
  })

  it('opens the mobile More sheet and reaches Help', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    const sheet = await screen.findByRole('dialog', { name: 'More' })
    fireEvent.click(within(sheet).getByRole('link', { name: /Help/ }))
    expect(await screen.findByRole('heading', { name: 'Help' })).toBeInTheDocument()
    expect(screen.getByText('How do I know what to do today?')).toBeInTheDocument()
  })
})
