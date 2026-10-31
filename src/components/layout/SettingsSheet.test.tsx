import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SettingsSheet } from './SettingsSheet'

describe('settings storage and capacity controls', () => {
  it('offers a storage guard that reaches 200 MB', async () => {
    render(<SettingsSheet onClose={vi.fn()} />)
    const slider = await screen.findByLabelText('Storage guard in megabytes')
    expect(slider).toHaveAttribute('min', '5')
    expect(slider).toHaveAttribute('max', '200')
    expect(slider).toHaveAttribute('step', '5')
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
