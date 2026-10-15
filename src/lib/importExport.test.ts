import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateImportData, exportData } from './importExport'
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

  it('accepts list with bar type', () => {
    const state = { lists: [{ ...validList, type: 'bar' as const }] }
    expect(validateImportData(state)).toBe(true)
  })
})

describe('exportData', () => {
  const state: AppState = { lists: [validList] }
  const originalShare = navigator.share
  const originalCanShare = navigator.canShare

  afterEach(() => {
    Object.assign(navigator, { share: originalShare, canShare: originalCanShare })
    vi.restoreAllMocks()
  })

  it('opens the share sheet with a JSON file when file sharing is supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { share, canShare: () => true })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')

    await exportData(state)

    expect(share).toHaveBeenCalledTimes(1)
    const file = share.mock.calls[0][0].files[0] as File
    expect(file.name).toMatch(/^bills-shopping-.*\.json$/)
    expect(click).not.toHaveBeenCalled()
  })

  it('treats closing the share sheet as success', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' })
    Object.assign(navigator, { share: vi.fn().mockRejectedValue(abort), canShare: () => true })
    await expect(exportData(state)).resolves.toBeUndefined()
  })

  it('falls back to a download link when files cannot be shared', async () => {
    Object.assign(navigator, { share: undefined, canShare: undefined })
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await exportData(state)

    expect(click).toHaveBeenCalledTimes(1)
  })
})
