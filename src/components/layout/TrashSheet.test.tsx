import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useAppStore } from '../../store/AppStore'
import { TrashSheet } from './TrashSheet'

describe('recently deleted', () => {
  it('starts empty and says so', () => {
    render(<TrashSheet onClose={() => {}} />)
    expect(screen.getByText('Nothing in the trash')).toBeInTheDocument()
  })

  it('restores a deleted week with its cards', () => {
    useAppStore.getState().deleteWeek('fl-w2')
    expect(useAppStore.getState().subjects[0]!.weeks.some((week) => week.id === 'fl-w2')).toBe(false)

    render(<TrashSheet onClose={() => {}} />)
    expect(screen.getByText('Week')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    expect(useAppStore.getState().subjects[0]!.weeks.some((week) => week.id === 'fl-w2')).toBe(true)
    expect(useAppStore.getState().trash).toEqual([])
    expect(screen.getByText('Nothing in the trash')).toBeInTheDocument()
  })

  it('arms a permanent delete before removing the copy', () => {
    useAppStore.getState().deleteWeek('fl-w2')
    render(<TrashSheet onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(useAppStore.getState().trash).toHaveLength(1)
    expect(screen.getByText(/This removes the copy in the trash/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }))
    expect(useAppStore.getState().trash).toEqual([])
  })

  it('empties the whole trash only after a second press', () => {
    useAppStore.getState().deleteWeek('fl-w2')
    useAppStore.getState().deleteWeek('fl-w3')
    render(<TrashSheet onClose={() => {}} />)

    fireEvent.click(screen.getByRole('button', { name: 'Empty the trash' }))
    expect(useAppStore.getState().trash).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Yes, empty it' }))
    expect(useAppStore.getState().trash).toEqual([])
  })
})
