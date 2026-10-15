import { describe, it, expect, beforeEach } from 'vitest'
import { loadSyncMeta, saveSyncMeta, clearSyncMeta, emptySyncMeta } from './syncMeta'

beforeEach(() => localStorage.clear())

describe('syncMeta', () => {
  it('returns null when absent', () => {
    expect(loadSyncMeta()).toBeNull()
  })

  it('round-trips', () => {
    const meta = { uid: 'u1', lastPulledAt: 10, synced: { l1: 'h' }, deleted: { l2: 5 } }
    saveSyncMeta(meta)
    expect(loadSyncMeta()).toEqual(meta)
  })

  it('returns null for invalid JSON or shape', () => {
    localStorage.setItem('sync-meta', '{oops')
    expect(loadSyncMeta()).toBeNull()
    localStorage.setItem('sync-meta', JSON.stringify({ synced: {} }))
    expect(loadSyncMeta()).toBeNull()
  })

  it('fills missing optional fields', () => {
    localStorage.setItem('sync-meta', JSON.stringify({ uid: 'u1' }))
    expect(loadSyncMeta()).toEqual(emptySyncMeta('u1'))
  })

  it('clears', () => {
    saveSyncMeta(emptySyncMeta('u1'))
    clearSyncMeta()
    expect(localStorage.getItem('sync-meta')).toBeNull()
  })
})
