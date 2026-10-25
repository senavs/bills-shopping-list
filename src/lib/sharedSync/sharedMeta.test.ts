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

  it('keeps one meta per account and loads the last one by default', () => {
    const u1 = { ...emptySharedMeta('u1'), pendingOps: [{ kind: 'leave' as const, listId: 'L' }] }
    saveSharedMeta(u1)
    saveSharedMeta(emptySharedMeta('u2'))
    expect(loadSharedMeta()?.uid).toBe('u2')
    expect(loadSharedMeta('u1')).toEqual(u1)
    expect(loadSharedMeta('u3')).toBeNull()
  })

  it('reads the single-account format written by earlier versions', () => {
    const legacy = { uid: 'u1', lists: {}, pendingOps: [{ kind: 'delete', listId: 'L' }] }
    localStorage.setItem('shared-sync-meta', JSON.stringify(legacy))
    expect(loadSharedMeta()).toEqual(legacy)
    expect(loadSharedMeta('u1')).toEqual(legacy)
    saveSharedMeta(emptySharedMeta('u2'))
    expect(loadSharedMeta('u1')).toEqual(legacy)
  })
})
