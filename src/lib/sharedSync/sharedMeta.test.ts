import { describe, it, expect, beforeEach } from 'vitest'
import { clearSharedMeta, emptySharedMeta, loadSharedMeta, saveSharedMeta } from './sharedMeta'

beforeEach(() => localStorage.clear())

describe('shared-sync-meta storage', () => {
  it('returns null when missing, invalid or without uid', () => {
    expect(loadSharedMeta()).toBeNull()
    localStorage.setItem('shared-sync-meta', '{oops')
    expect(loadSharedMeta()).toBeNull()
    localStorage.setItem('shared-sync-meta', JSON.stringify({ lists: {} }))
    expect(loadSharedMeta()).toBeNull()
  })

  it('round-trips and fills missing collections', () => {
    const meta = { ...emptySharedMeta('u1'), pendingOps: [{ kind: 'leave' as const, listId: 'L' }] }
    meta.lists.L = { pendingCreate: true, fields: { name: 'h' }, people: {}, sections: {}, items: { a: { hash: 'x', position: 1 } } }
    saveSharedMeta(meta)
    expect(loadSharedMeta()).toEqual(meta)
    localStorage.setItem('shared-sync-meta', JSON.stringify({ uid: 'u2' }))
    expect(loadSharedMeta()).toEqual(emptySharedMeta('u2'))
    clearSharedMeta()
    expect(loadSharedMeta()).toBeNull()
  })
})
