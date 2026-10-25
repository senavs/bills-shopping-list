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
const device = (remote: SharedRemote, initialUid: string | null, local: List[] = []) => {
  localStorage.setItem('app', JSON.stringify({ lists: local }))
  let stored: SharedMeta | null = null
  const metaStorage = { load: () => stored, save: (m: SharedMeta) => { stored = m } }
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
        <SharedSyncProvider pushDebounceMs={10} networkTimeoutMs={500} metaStorage={metaStorage}>
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
