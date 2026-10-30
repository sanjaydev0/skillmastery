import { describe, expect, it } from 'vitest'
import { checkReadabilityAvg, checkReadabilityTerms } from './style'

describe('readability validation', () => {
  describe('checkReadabilityAvg', () => {
    it('passes when average sentence length is under 18 words', () => {
      const text = 'This is a short sentence. Another short one here. And a third brief sentence.'
      const issues = checkReadabilityAvg('summary', text)
      expect(issues).toHaveLength(0)
    })

    it('fails when average sentence length exceeds 18 words', () => {
      const text = 'This is a very long sentence that goes on and on and on with many many many words to make it exceed the limit significantly.'
      const issues = checkReadabilityAvg('summary', text)
      expect(issues).toHaveLength(1)
      expect(issues[0].code).toBe('readability-avg')
      expect(issues[0].field).toBe('summary')
      expect(issues[0].message).toContain('Average sentence length')
    })

    it('handles empty text', () => {
      const issues = checkReadabilityAvg('summary', '')
      expect(issues).toHaveLength(0)
    })

    it('handles text with no sentences', () => {
      const issues = checkReadabilityAvg('summary', '...')
      expect(issues).toHaveLength(0)
    })
  })

  describe('checkReadabilityTerms', () => {
    it('passes when all technical terms are in glossary', () => {
      const text = 'Use the variable to store data in memory.'
      const glossary = ['variable', 'memory', 'data']
      const issues = checkReadabilityTerms('summary', text, glossary)
      expect(issues).toHaveLength(0)
    })

    it('fails when more than 3 unfamiliar terms are used', () => {
      const text = 'Use polymorphismPattern and encapsulationMethod with inheritanceChain and abstractionLayer.'
      const glossary = ['use'] // only common words in glossary
      const issues = checkReadabilityTerms('summary', text, glossary)
      expect(issues).toHaveLength(1)
      expect(issues[0].code).toBe('readability-terms')
      expect(issues[0].field).toBe('summary')
      expect(issues[0].message).toContain('unfamiliar technical terms')
    })

    it('passes when 3 or fewer unfamiliar terms are used', () => {
      const text = 'Use polymorphism and encapsulation here.'
      const glossary = ['use', 'here'] // only common words in glossary
      const issues = checkReadabilityTerms('summary', text, glossary)
      expect(issues).toHaveLength(0)
    })

    it('handles empty glossary', () => {
      const text = 'Use variable and function.'
      const glossary: string[] = []
      const issues = checkReadabilityTerms('summary', text, glossary)
      expect(issues).toHaveLength(0)
    })

    it('handles empty text', () => {
      const glossary = ['variable']
      const issues = checkReadabilityTerms('summary', '', glossary)
      expect(issues).toHaveLength(0)
    })

    it('is case-insensitive', () => {
      const text = 'Use VARIABLE and Function.'
      const glossary = ['variable', 'function']
      const issues = checkReadabilityTerms('summary', text, glossary)
      expect(issues).toHaveLength(0)
    })
  })
})
