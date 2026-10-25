import { describe, it, expect, vi } from 'vitest'
import { createMemorySharedRemote } from './memorySharedRemote'
import type { SharedParentDoc } from './types'

const TOKEN = 'tok-0123456789abcdefghijklmnop'
const parent = (over: Partial<SharedParentDoc> = {}): SharedParentDoc => ({
  id: 'L', ownerUid: 'alice', inviteToken: TOKEN, members: ['alice'], deleted: false, updatedAt: 1,
  name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 0,
  memberPeople: { alice: 'p1' }, people: { p1: { name: 'Ana', position: 0 } }, sections: {},
  ...over,
})
const flush = () => new Promise(r => setTimeout(r, 0))
const denied = expect.objectContaining({ code: 'permission-denied' })

describe('memorySharedRemote', () => {
  it('join checks the token and reports an existing membership', async () => {
    const r = createMemorySharedRemote()
    await r.create('alice', parent())
    await expect(r.join('bob', 'L', 'wrong')).rejects.toEqual(denied)
    await expect(r.join('bob', 'L', TOKEN)).resolves.toBe('joined')
    await expect(r.join('bob', 'L', TOKEN)).resolves.toBe('already')
    expect(r.peek('L')!.parent.members).toEqual(['alice', 'bob'])
  })

  it('create is idempotent', async () => {
    const r = createMemorySharedRemote()
    await expect(r.create('alice', parent())).resolves.toBe('created')
    await r.push('alice', 'L', { set: { name: 'Pub' }, remove: [] }, [])
    await expect(r.create('alice', parent())).resolves.toBe('exists')
    expect(r.peek('L')!.parent.name).toBe('Pub')
  })

  it('non-members cannot push or subscribe to items', async () => {
    const r = createMemorySharedRemote()
    await r.create('alice', parent())
    await expect(r.push('bob', 'L', { set: { name: 'x' }, remove: [] }, [])).rejects.toEqual(denied)
    const onError = vi.fn()
    r.subscribeItems('bob', 'L', vi.fn(), onError)
    await flush()
    expect(onError).toHaveBeenCalledWith(denied)
  })

  it('subscribers see pushes', async () => {
    const r = createMemorySharedRemote()
    await r.create('alice', parent())
    const lists = vi.fn()
    const items = vi.fn()
    r.subscribeLists('alice', lists, vi.fn())
    r.subscribeItems('alice', 'L', items, vi.fn())
    await r.push('alice', 'L', { set: { 'people.p2': { name: 'Bia', position: 1 } }, remove: [] }, [
      { id: 'a', name: 'a', quantity: 1, unitPrice: 1, selected: false, includeInTax: true, sectionId: null, position: 0 },
    ])
    await flush()
    expect(lists.mock.lastCall![0][0].people.p2).toEqual({ name: 'Bia', position: 1 })
    expect(lists.mock.lastCall![1]).toBe(false)
    expect(items.mock.lastCall![0].a).toMatchObject({ id: 'a', position: 0 })
  })

  it('leave removes the member and its memberPeople entry; only the owner deletes', async () => {
    const r = createMemorySharedRemote()
    await r.create('alice', parent())
    await r.join('bob', 'L', TOKEN)
    await r.push('bob', 'L', { set: { 'memberPeople.bob': 'p2' }, remove: [] }, [])
    await expect(r.deleteList('bob', 'L')).rejects.toEqual(denied)
    await r.leave('bob', 'L')
    expect(r.peek('L')!.parent.members).toEqual(['alice'])
    expect(r.peek('L')!.parent.memberPeople).toEqual({ alice: 'p1' })
    await r.deleteList('alice', 'L')
    expect(r.peek('L')!.parent.deleted).toBe(true)
  })

  it('offline writes reject with a network error', async () => {
    const r = createMemorySharedRemote()
    r.setOnline(false)
    await expect(r.create('alice', parent())).rejects.toEqual(expect.objectContaining({ code: 'unavailable' }))
  })

  it('refuses an 11th member', async () => {
    const r = createMemorySharedRemote()
    await r.create('alice', parent())
    for (let i = 0; i < 9; i++) await r.join(`m${i}`, 'L', TOKEN)
    await expect(r.join('bob', 'L', TOKEN)).rejects.toEqual(denied)
  })
})
