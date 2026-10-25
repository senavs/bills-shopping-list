import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateImportData, exportData, normalizeImportedState, mergeImportWithShared, stripShared } from './importExport'
import type { AppState, List } from '../types'

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

describe('import updatedAt', () => {
  const base = { id: 'l1', name: 'L', type: 'shopping', currency: 'BRL', taxPercentage: 0, items: [], sections: [], archived: false }

  it('normalizeImportedState stamps updatedAt with now', () => {
    const state = normalizeImportedState({ lists: [{ ...base, updatedAt: 1 } as never] }, 123)
    expect(state.lists[0].updatedAt).toBe(123)
  })

  it('validateImportData accepts numeric updatedAt and rejects non-numeric', () => {
    expect(validateImportData({ lists: [{ ...base, updatedAt: 5 }] })).toBe(true)
    expect(validateImportData({ lists: [{ ...base, updatedAt: 'x' }] })).toBe(false)
  })
})

describe('shared lists across import and export', () => {
  const shared: List = {
    ...validList, id: 'S', name: 'Bar',
    items: [{ id: 'i1', name: 'Beer', quantity: 1, unitPrice: 1, selected: false, includeInTax: true }],
    sections: [{ id: 's1', name: 'Drinks', itemIds: ['i1'], collapsed: false }],
    shared: { ownerUid: 'u1', inviteToken: 't', memberPeople: { u1: 'p1' } },
  }

  it('accepts a file that contains shared lists', () => {
    expect(validateImportData({ lists: [shared] })).toBe(true)
  })

  it('stripShared drops only the shared field', () => {
    const { shared: _s, ...rest } = shared
    expect(stripShared(shared)).toEqual(rest)
  })

  it('keeps local shared lists and gives colliding imports new ids', () => {
    const imported: AppState = { lists: [shared, { ...validList, id: 'P' }] }
    const result = mergeImportWithShared(imported, [shared, { ...validList, id: 'old' }])
    expect(result.lists.map(l => l.id)).toContain('S')
    expect(result.lists.find(l => l.id === 'S')).toBe(shared)
    expect(result.lists.some(l => l.id === 'old')).toBe(false)
    const copy = result.lists.find(l => l.name === 'Bar' && l.id !== 'S')!
    expect(copy.shared).toBeUndefined()
    expect(copy.items[0].id).not.toBe('i1')
    expect(copy.sections[0].id).not.toBe('s1')
    expect(copy.sections[0].itemIds).toEqual([copy.items[0].id])
    expect(result.lists.find(l => l.id === 'P')).toBeDefined()
  })

  it('imported shared lists become private even without a local collision', () => {
    const result = mergeImportWithShared({ lists: [shared] }, [])
    expect(result.lists).toEqual([stripShared(shared)])
  })
})
