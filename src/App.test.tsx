import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'

describe('application smoke tests', () => {
  it('renders the hydrated Overview and the active seed week', async () => {
    render(<App />)
    expect(await screen.findByText(/Ready to compound\?/)).toBeInTheDocument()
    expect(screen.getAllByText(/Dart types, sound null safety/i).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Overview' }).length).toBeGreaterThan(0)
    expect(screen.getByText(/new cards unscheduled/i)).toBeInTheDocument()
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
    window.location.hash = '#/recall'
    fireEvent(window, new HashChangeEvent('hashchange'))
    expect(await screen.findByRole('heading', { name: 'Recall' })).toBeInTheDocument()
    expect(screen.getByText(/SRS queue/i)).toBeInTheDocument()
  })
})
