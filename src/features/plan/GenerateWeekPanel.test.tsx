import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { weekOneDayPlans } from '../../data/dayPlans/week1'
import { useAppStore } from '../../store/AppStore'
import { AI_MODEL, setAiKey } from '../../services/ai'
import type { GenerateWeekResult } from '../../services/generateWeek'
import { PlanWeekPage } from './PlanWeekPage'

vi.mock('../../services/generateWeek', () => ({
  generateWeekFor: vi.fn(),
  cancelGeneration: vi.fn(),
  isGenerating: () => false,
  checkInterruptedGeneration: () => null,
  clearInterruptedGeneration: vi.fn(),
}))

const { generateWeekFor } = await import('../../services/generateWeek')

function draft(overrides: Partial<GenerateWeekResult> = {}): GenerateWeekResult {
  return {
    plans: weekOneDayPlans.map((plan) => ({ ...plan, origin: 'ai' as const })),
    issues: [],
    flags: [],
    gaps: [],
    model: AI_MODEL,
    generatedAt: 1_700_000_000_000,
    ...overrides,
  }
}

describe('week generation panel', () => {
  it('says Week 1 is written by hand and offers no rewrite', () => {
    render(<PlanWeekPage weekId="fl-w1" />)
    expect(screen.getByRole('heading', { name: 'Written by hand' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Write the seven cards/ })).not.toBeInTheDocument()
  })

  it('writes a draft, then saves the seven cards for the week', async () => {
    setAiKey('test-key-not-real')
    vi.mocked(generateWeekFor).mockResolvedValue(draft())

    render(<PlanWeekPage weekId="fl-w7" />)
    expect(screen.getByRole('heading', { name: 'Write this week' })).toBeInTheDocument()

    // Click "Write the seven cards" to show preview
    fireEvent.click(screen.getByRole('button', { name: /Write the seven cards/ }))

    // Click "Generate the week" in the preview to actually run generation
    expect(await screen.findByText('This is what will be sent to the AI:')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Generate the week' }))

    expect(await screen.findByText(/Draft ready: 7 cards/)).toBeInTheDocument()
    expect(screen.getByText(/All seven cards meet the prose standard/)).toBeInTheDocument()
    // The learner can read the draft before saving it.
    expect(screen.getByText(/Today you run your first Dart file/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save the seven cards' }))
    await waitFor(() => {
      expect(useAppStore.getState().dayPlans['fl-w7']).toHaveLength(7)
    })
    expect(useAppStore.getState().dayPlans['fl-w7']!.every((plan) => plan.origin === 'ai')).toBe(true)
  })

  it('shows the exact prompt in the preview and copies it', async () => {
    setAiKey('test-key-not-real')
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<PlanWeekPage weekId="fl-w7" />)
    fireEvent.click(screen.getByRole('button', { name: /Write the seven cards/ }))

    expect(await screen.findByText('This is what will be sent to the AI:')).toBeInTheDocument()
    expect(screen.getByText(/Read the exact prompt/).textContent).toMatch(/of 120,000 characters/)
    expect(screen.getByText(/Output cap: 8,000 tokens/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
  })

  it('blocks saving a draft that fails the prose standard', async () => {
    setAiKey('test-key-not-real')
    vi.mocked(generateWeekFor).mockResolvedValue(
      draft({
        issues: [{ field: 'summary', code: 'summary-length', message: 'Summary is 12 words. Target is 250–500.' }],
      }),
    )

    render(<PlanWeekPage weekId="fl-w7" />)

    // Click "Write the seven cards" to show preview
    fireEvent.click(screen.getByRole('button', { name: /Write the seven cards/ }))

    // Click "Generate the week" in the preview to actually run generation
    expect(await screen.findByText('This is what will be sent to the AI:')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Generate the week' }))

    expect(await screen.findByText('Fix these before saving')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save the seven cards' })).toBeDisabled()
    expect(useAppStore.getState().dayPlans['fl-w7']).toBeUndefined()
  })

  it('asks before replacing saved cards', () => {
    useAppStore.getState().saveDayPlans('fl-w2', weekOneDayPlans, 'ai')
    render(<PlanWeekPage weekId="fl-w2" />)
    expect(screen.getByText(/Seven cards saved/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Replace the seven cards/ }))
    expect(screen.getByText('Replace the saved cards with a new draft?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep the current cards' })).toBeInTheDocument()
    expect(generateWeekFor).not.toHaveBeenCalled()
  })
})
