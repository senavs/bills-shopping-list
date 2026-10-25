import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, waitFor, cleanup } from '@testing-library/react'
import { ListsProvider, useLists } from './ListsContext'
import { SyncProvider, useSync } from './SyncContext'
import { createMemoryRemote } from '../lib/sync/memoryRemote'
import { emptySyncMeta, loadSyncMeta, saveSyncMeta } from '../lib/sync/syncMeta'
import type { List } from '../types'
import type { AuthProvider, RemoteStore } from '../lib/sync/types'
import { consumeOAuthRedirect, startOAuthRedirect, takePendingToken, type RedirectWindow } from '../lib/sync/oauthRedirect'

const mk = (id: string, name = id, updatedAt = 1): List => ({
  id, name, type: 'shopping', currency: 'BRL', taxPercentage: 0, items: [], sections: [], archived: false, updatedAt,
})

const createFakeAuth = (initialUid: string | null = null) => {
  let uid = initialUid
  let listener: ((uid: string | null) => void) | null = null
  const auth: AuthProvider = {
    signIn: vi.fn(async () => { uid = 'u1'; listener?.(uid) }),
    signOut: vi.fn(async () => { uid = null; listener?.(null) }),
    onChange: cb => { listener = cb; cb(uid); return () => { listener = null } },
  }
  return auth
}

type Ctx = { lists: ReturnType<typeof useLists>; sync: ReturnType<typeof useSync> }

const setup = (opts: { remote?: RemoteStore; auth?: AuthProvider; local?: List[]; networkTimeoutMs?: number; configured?: boolean } = {}) => {
  localStorage.setItem('app', JSON.stringify({ lists: opts.local ?? [] }))
  const remote = opts.remote ?? createMemoryRemote()
  const auth = opts.auth ?? createFakeAuth()
  const loadBackend = opts.configured === false ? null : vi.fn(async () => ({ auth, remote }))
  let ctx!: Ctx
  const Capture = () => { ctx = { lists: useLists(), sync: useSync() }; return null }
  render(
    <ListsProvider>
      <SyncProvider loadBackend={loadBackend} pushDebounceMs={10} networkTimeoutMs={opts.networkTimeoutMs ?? 1000}>
        <Capture />
      </SyncProvider>
    </ListsProvider>,
  )
  return { get: () => ctx, remote, auth, loadBackend }
}

beforeEach(() => localStorage.clear())
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('SyncProvider', () => {
  it('is disabled when Firebase is not configured', () => {
    const { get } = setup({ configured: false })
    expect(get().sync.status).toBe('disabled')
  })

  it('starts signed out without loading the SDK for a user who never signed in', () => {
    const { get, loadBackend } = setup()
    expect(get().sync.status).toBe('signedOut')
    expect(loadBackend).not.toHaveBeenCalled()
  })

  it('first sign-in merges local and remote lists', async () => {
    const remote = createMemoryRemote()
    await remote.push('u1', [mk('cloud')], [])
    const { get } = setup({ remote, local: [mk('local')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    expect(get().lists.lists.map(l => l.id).sort()).toEqual(['cloud', 'local'])
    expect(remote.all('u1').map(d => d.id).sort()).toEqual(['cloud', 'local'])
    expect(loadSyncMeta()?.uid).toBe('u1')
  })

  it('signIn calls auth.signIn synchronously after prepare (keeps the iOS tap gesture)', async () => {
    const { get, auth } = setup()
    act(() => get().sync.prepare())
    await waitFor(() => expect(get().sync.status).toBe('signedOut'))
    await act(async () => { await Promise.resolve() })
    void get().sync.signIn()
    expect(auth.signIn).toHaveBeenCalledTimes(1)
  })

  it('pushes a local edit after the debounce', async () => {
    const remote = createMemoryRemote()
    const { get } = setup({ remote, local: [mk('a')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    act(() => get().lists.updateList('a', { name: 'renamed' }))
    await waitFor(() => expect(remote.all('u1').find(d => d.id === 'a')?.list?.name).toBe('renamed'))
  })

  it('pushes a deletion as a tombstone', async () => {
    const remote = createMemoryRemote()
    const { get } = setup({ remote, local: [mk('a')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    act(() => get().lists.deleteList('a'))
    await waitFor(() => expect(remote.all('u1').find(d => d.id === 'a')?.deleted).toBe(true))
  })

  it('flushes immediately when the page is hidden', async () => {
    const { get, remote } = setup({ local: [mk('a')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    const push = vi.spyOn(remote, 'push')
    act(() => get().lists.updateList('a', { name: 'x' }))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    await waitFor(() => expect(push).toHaveBeenCalled())
  })

  it('resumes for a returning signed-in user and pulls on startup', async () => {
    const remote = createMemoryRemote()
    await remote.push('u1', [mk('cloud')], [])
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ remote, auth: createFakeAuth('u1') })
    await waitFor(() => expect(get().lists.lists.map(l => l.id)).toEqual(['cloud']))
  })

  it('reports offline without calling the remote', async () => {
    const remote = createMemoryRemote()
    const pull = vi.spyOn(remote, 'pullSince')
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ remote, auth: createFakeAuth('u1') })
    await waitFor(() => expect(get().sync.status).toBe('offline'))
    expect(pull).not.toHaveBeenCalled()
  })

  it('a hanging network call times out to offline instead of syncing forever', async () => {
    const remote: RemoteStore = { pullSince: () => new Promise(() => {}), push: async () => {} }
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ remote, auth: createFakeAuth('u1'), networkTimeoutMs: 20 })
    await waitFor(() => expect(get().sync.status).toBe('offline'))
  })

  it('permission errors surface as auth error', async () => {
    const remote: RemoteStore = { pullSince: async () => { throw { code: 'permission-denied' } }, push: async () => {} }
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ remote, auth: createFakeAuth('u1') })
    await waitFor(() => expect(get().sync.status).toBe('error'))
    expect(get().sync.errorKind).toBe('auth')
  })

  it('an expired session for a returning user asks to sign in again', async () => {
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ auth: createFakeAuth(null) })
    await waitFor(() => expect(get().sync.status).toBe('error'))
    expect(get().sync.errorKind).toBe('auth')
  })

  it('cancelling the Google popup is silent', async () => {
    const auth = createFakeAuth()
    auth.signIn = vi.fn(async () => { throw { code: 'auth/popup-closed-by-user' } })
    const { get } = setup({ auth })
    await act(async () => { await get().sync.signIn() })
    expect(get().sync.status).toBe('signedOut')
  })

  it('sign out keeps lists and clears sync-meta, even with a cycle in flight', async () => {
    let releasePush!: () => void
    const remote = createMemoryRemote()
    const { get } = setup({ remote, local: [mk('a')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    vi.spyOn(remote, 'push').mockImplementation(() => new Promise<void>(r => { releasePush = r }))
    act(() => get().lists.updateList('a', { name: 'pending' }))
    await waitFor(() => expect(get().sync.status).toBe('syncing'))
    await act(async () => { await get().sync.signOut() })
    await act(async () => { releasePush() })
    expect(get().sync.status).toBe('signedOut')
    expect(loadSyncMeta()).toBeNull()
    expect(get().lists.lists.map(l => l.name)).toEqual(['pending'])
  })

  it('an edit made while a pull is in flight is kept and pushed afterwards', async () => {
    const memory = createMemoryRemote()
    let releasePull!: () => void
    const gate = new Promise<void>(r => { releasePull = r })
    const remote: RemoteStore = {
      pullSince: async (uid, cursor) => { await gate; return memory.pullSince(uid, cursor) },
      push: (uid, lists, tombs) => memory.push(uid, lists, tombs),
    }
    saveSyncMeta(emptySyncMeta('u1'))
    const { get } = setup({ remote, auth: createFakeAuth('u1'), local: [mk('a')] })
    await waitFor(() => expect(get().sync.status).toBe('syncing'))
    act(() => get().lists.updateList('a', { name: 'during-pull' }))
    await act(async () => { releasePull() })
    await waitFor(() => expect(memory.all('u1').find(d => d.id === 'a')?.list?.name).toBe('during-pull'))
    expect(get().lists.lists[0].name).toBe('during-pull')
  })

  it('loads the backend on startup when returning from the Google redirect, even for a first-time user', async () => {
    const win: RedirectWindow = {
      location: { origin: 'https://x', pathname: '/', hash: '#/app', assign: () => {} },
      history: { replaceState: () => {} },
    }
    let url = ''
    win.location.assign = u => { url = u }
    startOAuthRedirect('cid', win)
    win.location.hash = `#access_token=tok&state=${new URL(url).searchParams.get('state')}`
    expect(consumeOAuthRedirect(win)).toBe('token')
    const { loadBackend } = setup()
    await waitFor(() => expect(loadBackend).toHaveBeenCalled())
    takePendingToken()
  })

  it('a different account on the same device starts a fresh merge', async () => {
    saveSyncMeta({ ...emptySyncMeta('other'), synced: { gone: 'h' } })
    const remote = createMemoryRemote()
    const { get } = setup({ remote, auth: createFakeAuth('u1'), local: [mk('a')] })
    await waitFor(() => expect(remote.all('u1').map(d => d.id)).toEqual(['a']))
    expect(loadSyncMeta()?.uid).toBe('u1')
    expect(remote.all('u1').some(d => d.deleted)).toBe(false)
    await waitFor(() => expect(get().sync.status).toBe('idle'))
  })
})

describe('SyncProvider with shared lists', () => {
  const shared = (id: string): List => ({ ...mk(id), shared: { ownerUid: 'u1', inviteToken: 't'.repeat(36) } })

  it('never pushes a shared list and keeps it through a pull', async () => {
    const remote = createMemoryRemote()
    await remote.push('u1', [mk('cloud')], [])
    const { get } = setup({ remote, local: [shared('S'), mk('a')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    expect(remote.all('u1').map(d => d.id).sort()).toEqual(['a', 'cloud'])
    expect(get().lists.lists.map(l => l.id)).toEqual(['S', 'a', 'cloud'])
  })

  it('deleting a shared list locally creates no personal tombstone', async () => {
    const remote = createMemoryRemote()
    const { get } = setup({ remote, local: [shared('S')] })
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    act(() => get().lists.deleteList('S'))
    await new Promise(r => setTimeout(r, 50))
    await waitFor(() => expect(get().sync.status).toBe('idle'))
    expect(remote.all('u1')).toEqual([])
  })

  it('exposes the signed-in uid', async () => {
    const { get } = setup()
    await act(async () => { await get().sync.signIn() })
    await waitFor(() => expect(get().sync.uid).toBe('u1'))
    await act(async () => { await get().sync.signOut() })
    expect(get().sync.uid).toBeNull()
  })
})
