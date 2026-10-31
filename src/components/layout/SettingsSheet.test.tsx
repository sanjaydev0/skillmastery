import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SettingsSheet } from './SettingsSheet'

describe('settings storage and capacity controls', () => {
  it('states the fixed 4 MB budget and offers no storage guard control', async () => {
    render(<SettingsSheet onClose={vi.fn()} />)
    expect(await screen.findByText(/keeps a 4 MB budget on this device/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Storage guard in megabytes')).not.toBeInTheDocument()
  })

  it('keeps weekly capacity read-only until Manage is pressed', async () => {
    render(<SettingsSheet onClose={vi.fn()} />)

    const active = await screen.findByLabelText('Active hours per week')
    expect(active).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Manage' }))
    expect(screen.getByLabelText('Active hours per week')).not.toBeDisabled()
    expect(screen.getByLabelText('Passive hours per week')).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(screen.getByLabelText('Active hours per week')).toBeDisabled()
  })
})
