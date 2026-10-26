import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act, waitFor, cleanup } from '@testing-library/react'
import { useState } from 'react'
import { ListsProvider, useLists } from './ListsContext'
import { SyncContext, type SyncContextValue } from './SyncContext'
import { SharedSyncProvider, useSharedSync } from './SharedSyncContext'
import { createMemorySharedRemote, type MemorySharedRemote } from '../lib/sharedSync/memorySharedRemote'
import { createMemoryRemote } from '../lib/sync/memoryRemote'
import type { SharedMeta, SharedRemote } from '../lib/sharedSync/types'
import type { Item, List } from '../types'

type Ctx = { lists: ReturnType<typeof useLists>; shared: ReturnType<typeof useSharedSync> }

const item = (id: string): Omit<Item, 'id'> => ({ name: id, quantity: 1, unitPrice: 1, selected: false, includeInTax: true })

/** One simulated device: its own lists, its own shared-sync-meta, a controllable uid. */
const device = (remote: SharedRemote, initialUid: string | null, local: List[] = [], retryMs = 20) => {
  localStorage.setItem('app', JSON.stringify({ lists: local }))
  let stored: SharedMeta | null = null
  const byUid: Record<string, SharedMeta> = {}
  let saves = 0
  const metaStorage = {
    load: (uid?: string) => (uid ? byUid[uid] ?? null : stored),
    save: (m: SharedMeta) => { stored = m; byUid[m.uid] = m; saves++ },
  }
  const backend = { auth: { signIn: vi.fn(), signOut: vi.fn(), onChange: () => () => {} }, remote: createMemoryRemote(), shared: remote }
  let ctx!: Ctx
  let setUid!: (uid: string | null) => void
  const Capture = () => { ctx = { lists: useLists(), shared: useSharedSync() }; return null }
  const Harness = () => {
    const [uid, set] = useState(initialUid)
    setUid = set
    const value: SyncContextValue = {
      status: uid ? 'idle' : 'signedOut', errorKind: null, lastSyncedAt: null, uid, backend,
      prepare: vi.fn(), signIn: vi.fn(async () => {}), signOut: vi.fn(async () => {}), syncNow: vi.fn(),
    }
    return (
      <SyncContext.Provider value={value}>
        <SharedSyncProvider pushDebounceMs={10} networkTimeoutMs={500} listenerRetryMs={retryMs} metaStorage={metaStorage}>
          <Capture />
        </SharedSyncProvider>
      </SyncContext.Provider>
    )
  }
  render(<ListsProvider><Harness /></ListsProvider>)
  return {
    get: () => ctx,
    list: (id: string) => ctx.lists.lists.find(l => l.id === id),
    stored: () => stored,
    saves: () => saves,
    setUid: (uid: string | null) => act(() => setUid(uid)),
  }
}

const createShared = (d: ReturnType<typeof device>, uid = 'u1', name = 'Ana') => {
  let id = ''
  act(() => { id = d.get().lists.createSharedList({ name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 0 }, { uid, name }) })
  return id
}

/** A creates a list and B joins it with its own person. */
const twoDevices = async () => {
  const remote = createMemorySharedRemote()
  const A = device(remote, 'u1')
  const id = createShared(A)
  await waitFor(() => expect(remote.peek(id)).toBeDefined())
  const B = device(remote, 'u2')
  let result = ''
  await act(async () => { result = await B.get().shared.joinList(id, A.list(id)!.shared!.inviteToken) })
  expect(result).toBe('ok')
  await waitFor(() => expect(B.list(id)).toBeDefined())
  return { remote, A, B, id }
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })

describe('SharedSyncProvider', () => {
  it('creates a new shared list on the server with the owner as only member', async () => {
    const remote = createMemorySharedRemote()
    const A = device(remote, 'u1')
    const id = createShared(A)
    expect(A.get().shared.isPendingCreate(id)).toBe(true)
    await waitFor(() => expect(remote.peek(id)?.parent.members).toEqual(['u1']))
    expect(Object.values(remote.peek(id)!.parent.people)).toEqual([{ name: 'Ana', position: 0 }])
    await waitFor(() => expect(A.get().shared.isPendingCreate(id)).toBe(false))
  })

  it('a joined member receives the list and its edits reach the owner', async () => {
    const { A, B, id } = await twoDevices()
    act(() => B.get().lists.addMemberPerson(id, 'u2', 'Bia'))
    await waitFor(() => expect(A.list(id)!.people!.map(p => p.name)).toEqual(['Ana', 'Bia']))
    expect(A.list(id)!.shared!.memberPeople!.u2).toBe(B.list(id)!.shared!.memberPeople!.u2)
  })

  it('joining with a wrong token is invalid', async () => {
    const remote = createMemorySharedRemote()
    const A = device(remote, 'u1')
    const id = createShared(A)
    await waitFor(() => expect(remote.peek(id)).toBeDefined())
    const B = device(remote, 'u2')
    let result = ''
    await act(async () => { result = await B.get().shared.joinList(id, 'wrong-token-0123456789') })
    expect(result).toBe('invalid')
  })

  it('items added at the same time on both devices all survive', async () => {
    const { A, B, id } = await twoDevices()
    act(() => { A.get().lists.addItem(id, item('beer')) })
    act(() => { B.get().lists.addItem(id, item('fries')) })
    await waitFor(() => {
      expect(A.list(id)!.items.map(i => i.name).sort()).toEqual(['beer', 'fries'])
      expect(B.list(id)!.items.map(i => i.name).sort()).toEqual(['beer', 'fries'])
    })
  })

  it('an edit made while a push is in flight is sent afterwards', async () => {
    const memory = createMemorySharedRemote()
    let release: (() => void) | null = null
    const slow: SharedRemote = {
      ...memory,
      push: async (...args) => {
        await new Promise<void>(r => { release = r })
        return memory.push(...args)
      },
    }
    const A = device(slow, 'u1')
    const id = createShared(A)
    let itemId = ''
    act(() => { itemId = A.get().lists.addItem(id, item('beer')) })
    await waitFor(() => expect(release).not.toBeNull())
    act(() => A.get().lists.updateItem(id, itemId, { name: 'IPA' }))
    act(() => release!())
    await waitFor(() => { release?.(); expect(memory.peek(id)?.items[itemId]).toMatchObject({ name: 'IPA' }) })
  })

  it('a snapshot from cache never removes lists; a server snapshot without the list does', async () => {
    const memory = createMemorySharedRemote()
    let emit: ((docs: never[], fromCache: boolean) => void) | null = null
    const controlled: SharedRemote = { ...memory, subscribeLists: (_uid, cb) => { emit = cb; return () => {} } }
    const A = device(controlled, 'u1')
    const id = createShared(A)
    await waitFor(() => expect(memory.peek(id)).toBeDefined())
    await waitFor(() => expect(A.get().shared.isPendingCreate(id)).toBe(false))
    act(() => emit!([], true))
    expect(A.list(id)).toBeDefined()
    act(() => emit!([], false))
    await waitFor(() => expect(A.list(id)).toBeUndefined())
    expect(A.get().shared.notices).toEqual([expect.objectContaining({ kind: 'removed', listName: 'Bar' })])
  })

  it('when the owner deletes, members lose the list with a notice', async () => {
    const { A, B, id } = await twoDevices()
    act(() => A.get().shared.deleteSharedList(id))
    expect(A.list(id)).toBeUndefined()
    await waitFor(() => expect(B.list(id)).toBeUndefined())
    expect(B.get().shared.notices).toEqual([expect.objectContaining({ kind: 'deleted', listName: 'Bar' })])
    expect(A.get().shared.notices).toEqual([])
  })

  it('a deleted list left in the query does not rewrite the meta on every snapshot', async () => {
    const { A, B, id } = await twoDevices()
    act(() => A.get().shared.deleteSharedList(id))
    await waitFor(() => expect(B.list(id)).toBeUndefined())
    await new Promise(r => setTimeout(r, 30))
    const before = B.saves()
    // Any write on the server sends B a new snapshot that still contains the tombstone
    createShared(A)
    await new Promise(r => setTimeout(r, 50))
    expect(B.saves()).toBe(before)
  })

  it('changing the set of lists does not resubscribe the other item listeners', async () => {
    const memory = createMemorySharedRemote()
    const calls: string[] = []
    const counting: SharedRemote = { ...memory, subscribeItems: (...args) => { calls.push(args[1]); return memory.subscribeItems(...args) } }
    const A = device(counting, 'u1')
    const first = createShared(A)
    await waitFor(() => expect(calls).toContain(first))
    const second = createShared(A)
    await waitFor(() => expect(calls).toContain(second))
    act(() => A.get().lists.archiveList(second))
    await new Promise(r => setTimeout(r, 50))
    expect(calls.filter(id => id === first)).toHaveLength(1)
  })

  it('the lists listener is restarted after an error', async () => {
    const memory = createMemorySharedRemote()
    let attempts = 0
    const flaky: SharedRemote = {
      ...memory,
      subscribeLists: (uid, cb, onError) => {
        attempts++
        if (attempts === 1) {
          queueMicrotask(() => onError(Object.assign(new Error('x'), { code: 'unauthenticated' })))
          return () => {}
        }
        return memory.subscribeLists(uid, cb, onError)
      },
    }
    const A = device(memory, 'u1')
    const id = createShared(A)
    await waitFor(() => expect(memory.peek(id)).toBeDefined())
    const B = device(flaky, 'u2')
    await act(async () => { await B.get().shared.joinList(id, A.list(id)!.shared!.inviteToken) })
    await waitFor(() => expect(B.list(id)).toBeDefined())
    expect(attempts).toBeGreaterThan(1)
  })

  it('an item listener error restarts only the item listener', async () => {
    const memory = createMemorySharedRemote()
    let listSubs = 0
    let itemSubs = 0
    const flaky: SharedRemote = {
      ...memory,
      subscribeLists: (...args) => { listSubs++; return memory.subscribeLists(...args) },
      subscribeItems: (uid, listId, cb, onError) => {
        itemSubs++
        if (itemSubs === 1) {
          queueMicrotask(() => onError(Object.assign(new Error('x'), { code: 'internal' })))
          return () => {}
        }
        return memory.subscribeItems(uid, listId, cb, onError)
      },
    }
    const A = device(flaky, 'u1')
    createShared(A)
    await waitFor(() => expect(itemSubs).toBeGreaterThan(1))
    await new Promise(r => setTimeout(r, 50))
    expect(listSubs).toBe(1)
  })

  it('a lists listener that keeps failing backs off', async () => {
    const memory = createMemorySharedRemote()
    let attempts = 0
    const broken: SharedRemote = {
      ...memory,
      subscribeLists: (_uid, _cb, onError) => {
        attempts++
        queueMicrotask(() => onError(Object.assign(new Error('x'), { code: 'internal' })))
        return () => {}
      },
    }
    device(broken, 'u1')
    // 20 ms base: retries at ~20, 60, 140, 300 ms; a fixed 20 ms delay would give ~15 attempts
    await new Promise(r => setTimeout(r, 300))
    expect(attempts).toBeGreaterThanOrEqual(3)
    expect(attempts).toBeLessThanOrEqual(6)
  })

  it('a member cannot delete for everyone', async () => {
    const { B, remote, id } = await twoDevices()
    act(() => B.get().shared.deleteSharedList(id))
    expect(B.list(id)).toBeDefined()
    expect(remote.peek(id)!.parent.deleted).toBe(false)
  })

  it('leaving offline is queued and sent when back online', async () => {
    const { B, remote, id } = await twoDevices()
    ;(remote as MemorySharedRemote).setOnline(false)
    act(() => B.get().shared.leaveList(id))
    expect(B.list(id)).toBeUndefined()
    await waitFor(() => expect(B.get().shared.status).toBe('offline'))
    expect(B.stored()!.pendingOps).toEqual([{ kind: 'leave', listId: id }])
    ;(remote as MemorySharedRemote).setOnline(true)
    act(() => { window.dispatchEvent(new Event('online')) })
    await waitFor(() => expect(remote.peek(id)!.parent.members).toEqual(['u1']))
    await waitFor(() => expect(B.stored()!.pendingOps).toEqual([]))
    expect(B.list(id)).toBeUndefined()
  })

  it('a leave queued under one account survives switching accounts and back', async () => {
    const { B, remote, id } = await twoDevices()
    ;(remote as MemorySharedRemote).setOnline(false)
    act(() => B.get().shared.leaveList(id))
    await waitFor(() => expect(B.get().shared.status).toBe('offline'))
    B.setUid('u3')
    await waitFor(() => expect(B.stored()!.uid).toBe('u3'))
    ;(remote as MemorySharedRemote).setOnline(true)
    B.setUid('u2')
    await waitFor(() => expect(remote.peek(id)!.parent.members).toEqual(['u1']))
    expect(B.list(id)).toBeUndefined()
  })

  it('an account coming back on a shared device does not overwrite newer remote edits', async () => {
    const { A, remote, id } = await twoDevices()
    const token = A.list(id)!.shared!.inviteToken
    let itemId = ''
    act(() => { itemId = A.get().lists.addItem(id, item('milk')) })
    await waitFor(() => expect(remote.peek(id)?.items[itemId]).toBeDefined())
    // A tablet used by u4 then u5, both members
    const T = device(remote, 'u4')
    await act(async () => { await T.get().shared.joinList(id, token) })
    await waitFor(() => expect(T.list(id)?.items).toHaveLength(1))
    await waitFor(() => expect(T.stored()!.lists[id]?.items[itemId]).toBeDefined())
    T.setUid('u5')
    await act(async () => { await T.get().shared.joinList(id, token) })
    await waitFor(() => expect(T.stored()!.uid).toBe('u5'))
    await waitFor(() => expect(T.stored()!.lists[id]?.items[itemId]).toBeDefined())
    act(() => T.get().lists.updateItem(id, itemId, { name: 'milk2' }))
    await waitFor(() => expect(remote.peek(id)!.items[itemId]).toMatchObject({ name: 'milk2' }))
    T.setUid(null)
    await waitFor(() => expect(A.list(id)!.items[0].name).toBe('milk2'))
    act(() => A.get().lists.updateItem(id, itemId, { name: 'oat milk' }))
    await waitFor(() => expect(remote.peek(id)!.items[itemId]).toMatchObject({ name: 'oat milk' }))
    T.setUid('u4')
    await waitFor(() => expect(T.list(id)!.items[0].name).toBe('oat milk'))
    await new Promise(r => setTimeout(r, 50))
    expect(remote.peek(id)!.items[itemId]).toMatchObject({ name: 'oat milk' })
  })

  it('after sign-out remote changes stop arriving and the meta is kept', async () => {
    const { A, B, id } = await twoDevices()
    B.setUid(null)
    act(() => { A.get().lists.addItem(id, item('beer')) })
    await waitFor(() => expect(Object.keys(A.stored()!.lists[id].items)).toHaveLength(1))
    await new Promise(r => setTimeout(r, 30))
    expect(B.list(id)!.items).toEqual([])
    expect(B.stored()?.uid).toBe('u2')
  })

  it('knows the role while signed out and queues the owner delete', async () => {
    const { A, B, remote, id } = await twoDevices()
    A.setUid(null)
    expect(A.get().shared.roleOf(id)).toBe('owner')
    expect(B.get().shared.roleOf(id)).toBe('member')
    act(() => A.get().shared.deleteSharedList(id))
    expect(A.list(id)).toBeUndefined()
    expect(A.stored()!.pendingOps).toEqual([{ kind: 'delete', listId: id }])
    A.setUid('u1')
    await waitFor(() => expect(remote.peek(id)!.parent.deleted).toBe(true))
  })

  it('a leave the server refuses is dropped and other lists keep syncing', async () => {
    const memory = createMemorySharedRemote()
    const refusing: SharedRemote = { ...memory, leave: async () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }) } }
    const A = device(memory, 'u1')
    const id = createShared(A)
    await waitFor(() => expect(memory.peek(id)).toBeDefined())
    const B = device(refusing, 'u2')
    await act(async () => { await B.get().shared.joinList(id, A.list(id)!.shared!.inviteToken) })
    await waitFor(() => expect(B.list(id)).toBeDefined())
    const own = createShared(B, 'u2', 'Bia')
    await waitFor(() => expect(memory.peek(own)).toBeDefined())
    act(() => B.get().shared.leaveList(id))
    await waitFor(() => expect(B.stored()!.pendingOps).toEqual([]))
    act(() => { B.get().lists.addItem(own, item('fries')) })
    await waitFor(() => expect(Object.values(memory.peek(own)!.items)).toHaveLength(1))
  })

  it('a remote change landing during our push of the same item is not lost', async () => {
    const memory = createMemorySharedRemote()
    let hold: Promise<void> | null = null
    let release: (() => void) | null = null
    const slow: SharedRemote = {
      ...memory,
      push: async (...args) => {
        await memory.push(...args)
        if (hold) await hold
      },
    }
    const A = device(slow, 'u1')
    const id = createShared(A)
    let itemId = ''
    act(() => { itemId = A.get().lists.addItem(id, item('beer')) })
    await waitFor(() => expect(memory.peek(id)?.items[itemId]).toBeDefined())
    await waitFor(() => expect(A.stored()!.lists[id].items[itemId]).toBeDefined())
    hold = new Promise<void>(r => { release = r })
    act(() => A.get().lists.updateItem(id, itemId, { name: 'IPA' }))
    await waitFor(() => expect(memory.peek(id)!.items[itemId]).toMatchObject({ name: 'IPA' }))
    // Another member's write lands after ours while our push is still awaiting
    const theirs = { ...(memory.peek(id)!.items[itemId] as object), name: 'Stout' } as never
    await act(async () => { await memory.push('u1', id, { set: {}, remove: [] }, [theirs]) })
    hold = null
    act(() => release!())
    await waitFor(() => expect(A.list(id)!.items[0].name).toBe('Stout'))
  })

  it('deleting a list while its create is in flight keeps it deleted', async () => {
    const memory = createMemorySharedRemote()
    let release: (() => void) | null = null
    const slow: SharedRemote = {
      ...memory,
      create: async (...args) => {
        await new Promise<void>(r => { release = r })
        return memory.create(...args)
      },
    }
    const A = device(slow, 'u1')
    const id = createShared(A)
    await waitFor(() => expect(release).not.toBeNull())
    act(() => A.get().shared.deleteSharedList(id))
    expect(A.list(id)).toBeUndefined()
    act(() => release!())
    await waitFor(() => expect(memory.peek(id)?.parent.deleted).toBe(true))
    await new Promise(r => setTimeout(r, 30))
    expect(A.list(id)).toBeUndefined()
  })

  it('a stale local copy without meta does not overwrite newer remote content', async () => {
    const { A, B, remote, id } = await twoDevices()
    let itemId = ''
    act(() => { itemId = A.get().lists.addItem(id, item('beer')) })
    await waitFor(() => expect(B.list(id)!.items).toHaveLength(1))
    await waitFor(() => expect(A.stored()!.lists[id].items[itemId]).toBeDefined())
    const stale = A.list(id)!
    act(() => B.get().lists.updateItem(id, itemId, { name: 'IPA' }))
    await waitFor(() => expect(remote.peek(id)!.items[itemId]).toMatchObject({ name: 'IPA' }))
    cleanup()
    // Same owner on a device whose shared-sync-meta was lost
    const A2 = device(remote, 'u1', [stale])
    await waitFor(() => expect(A2.list(id)!.items[0].name).toBe('IPA'))
    await new Promise(r => setTimeout(r, 50))
    expect(remote.peek(id)!.items[itemId]).toMatchObject({ name: 'IPA' })
  })

  it('two devices reordering different items converge on the same order', async () => {
    const { A, B, id } = await twoDevices()
    for (const name of ['a', 'b', 'c', 'd']) act(() => { A.get().lists.addItem(id, item(name)) })
    await waitFor(() => expect(B.list(id)!.items.map(i => i.name)).toEqual(['a', 'b', 'c', 'd']))
    await waitFor(() => expect(Object.keys(B.stored()!.lists[id].items)).toHaveLength(4))
    act(() => A.get().lists.reorderItem(id, 0, 3))
    act(() => B.get().lists.reorderItem(id, 3, 0))
    const names = (d: typeof A) => d.list(id)!.items.map(i => i.name)
    await waitFor(() => {
      expect(names(A)).toEqual(['d', 'b', 'c', 'a'])
      expect(names(B)).toEqual(['d', 'b', 'c', 'a'])
    })
  })

  it('an item deleted offline on one device and edited online on the other ends up deleted on both', async () => {
    const memory = createMemorySharedRemote()
    let bOffline = false
    const offline = () => Promise.reject(Object.assign(new Error('offline'), { code: 'unavailable' }))
    const bRemote: SharedRemote = { ...memory, push: (...args) => (bOffline ? offline() : memory.push(...args)) }
    const A = device(memory, 'u1')
    const id = createShared(A)
    await waitFor(() => expect(memory.peek(id)).toBeDefined())
    const B = device(bRemote, 'u2')
    await act(async () => { await B.get().shared.joinList(id, A.list(id)!.shared!.inviteToken) })
    let itemId = ''
    act(() => { itemId = A.get().lists.addItem(id, item('beer')) })
    await waitFor(() => expect(B.list(id)?.items).toHaveLength(1))
    await waitFor(() => expect(B.stored()!.lists[id].items[itemId]).toBeDefined())
    bOffline = true
    act(() => B.get().lists.deleteItem(id, itemId))
    await waitFor(() => expect(B.get().shared.status).toBe('offline'))
    act(() => A.get().lists.updateItem(id, itemId, { name: 'IPA' }))
    await waitFor(() => expect(memory.peek(id)!.items[itemId]).toMatchObject({ name: 'IPA' }))
    await new Promise(r => setTimeout(r, 30))
    expect(B.list(id)!.items).toEqual([])
    bOffline = false
    act(() => { window.dispatchEvent(new Event('online')) })
    await waitFor(() => expect(A.list(id)!.items).toEqual([]))
    expect(memory.peek(id)!.items[itemId]).toEqual({ id: itemId, deleted: true })
  })

  it('archived lists get no item updates until unarchived', async () => {
    const { A, B, id } = await twoDevices()
    act(() => B.get().lists.archiveList(id))
    act(() => { A.get().lists.addItem(id, item('beer')) })
    await waitFor(() => expect(Object.keys(A.stored()!.lists[id].items)).toHaveLength(1))
    await new Promise(r => setTimeout(r, 30))
    expect(B.list(id)!.items).toEqual([])
    act(() => B.get().lists.unarchiveList(id))
    await waitFor(() => expect(B.list(id)!.items.map(i => i.name)).toEqual(['beer']))
    expect(B.list(id)!.archived).toBe(false)
  })
})
