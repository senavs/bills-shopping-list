import { describe, it, expect } from 'vitest'
import { validateImportData } from './importExport'
import type { AppState } from '../types'

const validList = {
  id: '1', name: 'Test', type: 'shopping' as const, currency: 'USD' as const,
  taxPercentage: 0, items: [], sections: [], archived: false,
}

describe('validateImportData', () => {
  it('accepts valid state with sections', () => {
    const state: AppState = { lists: [validList] }
    expect(validateImportData(state)).toBe(true)
  })

  it('accepts state without sections field (legacy)', () => {
    const legacy = { lists: [{ ...validList, sections: undefined }] }
    expect(validateImportData(legacy)).toBe(true)
  })

  it('accepts valid sections', () => {
    const state = { lists: [{ ...validList, sections: [{ id: 's1', name: 'Dairy', itemIds: [], collapsed: false }] }] }
    expect(validateImportData(state)).toBe(true)
  })

  it('rejects sections that is not an array', () => {
    const state = { lists: [{ ...validList, sections: 'bad' }] }
    expect(validateImportData(state)).toBe(false)
  })

  it('rejects section missing collapsed field', () => {
    const state = { lists: [{ ...validList, sections: [{ id: 's1', name: 'Dairy', itemIds: [] }] }] }
    expect(validateImportData(state)).toBe(false)
  })

  it('rejects invalid top-level structure', () => {
    expect(validateImportData(null)).toBe(false)
    expect(validateImportData({ lists: 'bad' })).toBe(false)
  })
})
