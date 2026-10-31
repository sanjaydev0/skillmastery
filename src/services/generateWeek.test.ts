import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  checkInterruptedGeneration,
  clearInterruptedGeneration,
} from './generateWeek'

describe('interrupted generation recovery', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('returns null when no interrupted generation exists', () => {
    expect(checkInterruptedGeneration()).toBeNull()
  })

  it('returns the weekId when an interrupted generation exists', () => {
    sessionStorage.setItem('skillmastery:generation:interrupted', 'flutter:5')
    expect(checkInterruptedGeneration()).toBe('flutter:5')
  })

  it('clears the interrupted generation state', () => {
    sessionStorage.setItem('skillmastery:generation:interrupted', 'flutter:5')
    clearInterruptedGeneration()
    expect(checkInterruptedGeneration()).toBeNull()
  })

  it('handles sessionStorage being unavailable', () => {
    const originalSetItem = sessionStorage.setItem
    const originalGetItem = sessionStorage.getItem
    const originalRemoveItem = sessionStorage.removeItem

    // Mock sessionStorage methods to throw
    sessionStorage.setItem = () => {
      throw new Error('Storage unavailable')
    }
    sessionStorage.getItem = () => {
      throw new Error('Storage unavailable')
    }
    sessionStorage.removeItem = () => {
      throw new Error('Storage unavailable')
    }

    // Should not throw
    expect(() => clearInterruptedGeneration()).not.toThrow()
    expect(checkInterruptedGeneration()).toBeNull()

    // Restore original methods
    sessionStorage.setItem = originalSetItem
    sessionStorage.getItem = originalGetItem
    sessionStorage.removeItem = originalRemoveItem
  })
})
