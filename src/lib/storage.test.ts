import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadState, saveState } from './storage'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadState', () => {
    it('returns empty lists on first load', () => {
      const state = loadState()
      expect(state).toEqual({ lists: [] })
    })

    it('loads saved state from localStorage', () => {
      const mockState = { lists: [{ id: '1', name: 'Test', type: 'shopping' as const, currency: 'USD' as const, taxPercentage: 10, items: [], archived: false }] }
      localStorage.setItem('app', JSON.stringify(mockState))
      
      const state = loadState()
      expect(state).toEqual(mockState)
    })

    it('returns empty lists on parse error', () => {
      localStorage.setItem('app', 'invalid json')
      const state = loadState()
      expect(state).toEqual({ lists: [] })
    })
  })

  describe('saveState', () => {
    it('saves state to localStorage', () => {
      const state = { lists: [{ id: '1', name: 'Test', type: 'shopping' as const, currency: 'USD' as const, taxPercentage: 10, items: [], archived: false }] }
      saveState(state)
      
      const saved = localStorage.getItem('app')
      expect(JSON.parse(saved!)).toEqual(state)
    })

    it('handles quota exceeded silently', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      
      expect(() => saveState({ lists: [] })).not.toThrow()
    })
  })
})
