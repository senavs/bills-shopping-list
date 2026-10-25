import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLists } from './ListsContext'
import { useSync } from './SyncContext'
import type { List } from '../types'
import type { ListMeta, RemoteItem, SharedMeta, SharedParentDoc } from '../lib/sharedSync/types'
import { applyMetaPatch, diffLocal, newParentDoc } from '../lib/sharedSync/diff'
import { mergeSnapshot } from '../lib/sharedSync/merge'
import { emptySharedMeta, loadSharedMeta, saveSharedMeta } from '../lib/sharedSync/sharedMeta'
import type { SharedSyncStatus } from '../lib/sharedSync/status'
import { classifyError, withTimeout } from '../lib/sync/errors'

export interface SharedNotice {
  id: string
  kind: 'deleted' | 'removed'
  listName: string
}

export interface SharedSyncValue {
  status: SharedSyncStatus
  roleOf: (listId: string) => 'owner' | 'member' | null
  isPendingCreate: (listId: string) => boolean
  joinList: (listId: string, token: string) => Promise<'ok' | 'invalid' | 'network'>
  leaveList: (listId: string) => void
  deleteSharedList: (listId: string) => void
  notices: SharedNotice[]
  dismissNotice: (id: string) => void
}

const INERT: SharedSyncValue = {
  status: 'idle',
  roleOf: () => null,
  isPendingCreate: () => false,
  joinList: async () => 'network',
  leaveList: () => {},
  deleteSharedList: () => {},
  notices: [],
  dismissNotice: () => {},
}

export const SharedSyncContext = createContext<SharedSyncValue>(INERT)

// Works without a provider (tests, unconfigured builds): shared sync does nothing
export const useSharedSync = () => useContext(SharedSyncContext)

interface MetaStorage {
  load: () => SharedMeta | null
  save: (meta: SharedMeta) => void
}

const defaultStorage: MetaStorage = { load: loadSharedMeta, save: saveSharedMeta }

interface SharedSyncProviderProps {
  children: ReactNode
  pushDebounceMs?: number
  networkTimeoutMs?: number
  metaStorage?: MetaStorage
}

const replaceById = (lists: List[], list: List) => {
  const i = lists.findIndex(l => l.id === list.id)
  if (i < 0) return [...lists, list]
  const next = [...lists]
  next[i] = list
  return next
}

/**
 * Syncs lists that have `shared` with sharedLists/{id} (docs/sync.md). The
 * personal sync ignores them. localStorage stays the source of truth: local
 * edits are diffed against shared-sync-meta and pushed per entity; snapshots
 * are merged per entity.
 */
export const SharedSyncProvider = ({ children, pushDebounceMs = 1000, networkTimeoutMs = 15000, metaStorage = defaultStorage }: SharedSyncProviderProps) => {
  const { uid, backend } = useSync()
  const { lists, replaceLists, deleteList } = useLists()

  // Latest lists including our own not-yet-rendered replacements, so two
  // snapshots in the same tick merge onto each other instead of a stale copy
  const listsRef = useRef(lists)
  useEffect(() => { listsRef.current = lists }, [lists])
  const uidRef = useRef(uid)
  uidRef.current = uid
  const backendRef = useRef(backend)
  backendRef.current = backend

  const metaRef = useRef<SharedMeta | null>(metaStorage.load())
  const parentsRef = useRef(new Map<string, SharedParentDoc>())
  const itemsRef = useRef(new Map<string, Record<string, RemoteItem>>())
  const runningRef = useRef(false)
  const pendingRef = useRef(false)

  const [status, setStatus] = useState<SharedSyncStatus>('idle')
  const [notices, setNotices] = useState<SharedNotice[]>([])
  const [, setMetaVersion] = useState(0)
  const [parentsVersion, setParentsVersion] = useState(0)

  const saveMeta = (meta: SharedMeta) => {
    metaRef.current = meta
    metaStorage.save(meta)
    setMetaVersion(v => v + 1)
  }
  const setListMeta = (listId: string, lm: ListMeta | null) => {
    const meta = metaRef.current
    if (!meta) return
    const { [listId]: _old, ...rest } = meta.lists
    saveMeta({ ...meta, lists: lm ? { ...rest, [listId]: lm } : rest })
  }

  const putLocal = (list: List) => {
    listsRef.current = replaceById(listsRef.current, list)
    replaceLists(prev => replaceById(prev, list))
  }
  const removeLocal = (listId: string) => {
    listsRef.current = listsRef.current.filter(l => l.id !== listId)
    replaceLists(prev => prev.filter(l => l.id !== listId))
  }
  const notify = (kind: SharedNotice['kind'], listName: string) =>
    setNotices(prev => [...prev, { id: crypto.randomUUID(), kind, listName }])

  const fail = (error: unknown) => setStatus(classifyError(error) === 'offline' ? 'offline' : 'error')

  const dropOp = (op: SharedMeta['pendingOps'][number]) => {
    const meta = metaRef.current
    if (!meta) return
    const { [op.listId]: _done, ...rest } = meta.lists
    saveMeta({ ...meta, lists: rest, pendingOps: meta.pendingOps.filter(o => !(o.kind === op.kind && o.listId === op.listId)) })
  }

  const hasPendingOp = (listId: string) => !!metaRef.current?.pendingOps.some(op => op.listId === listId)

  // Signed out (or session expired) we still know who we were: leave/delete get queued under that account
  const myUid = () => uidRef.current ?? metaRef.current?.uid ?? null

  const roleOf = (listId: string): 'owner' | 'member' | null => {
    const list = listsRef.current.find(l => l.id === listId)
    const me = myUid()
    if (!list?.shared || !me) return null
    return list.shared.ownerUid === me ? 'owner' : 'member'
  }

  /** Created here but not confirmed by the server yet. */
  const isPendingCreate = (listId: string) => {
    const list = listsRef.current.find(l => l.id === listId)
    const lm = metaRef.current?.lists[listId]
    return !!list?.shared && (lm ? !!lm.pendingCreate : list.shared.ownerUid === myUid())
  }

  const applyRemote = (listId: string) => {
    const parent = parentsRef.current.get(listId)
    const meta = metaRef.current
    if (!parent || !meta || hasPendingOp(listId)) return
    const local = listsRef.current.find(l => l.id === listId)
    const items = itemsRef.current.get(listId) ?? null
    // A pendingCreate placeholder is not sync state: the list turned out to exist remotely
    const lm = meta.lists[listId]?.pendingCreate ? undefined : meta.lists[listId]
    // Without a meta, a local copy can only be compared once the items have arrived
    if (local && !lm && items === null) return
    const merged = mergeSnapshot(local, parent, items, lm)
    putLocal(merged.list)
    setListMeta(listId, merged.meta)
  }

  const onParents = (docs: SharedParentDoc[], fromCache: boolean) => {
    const meta = metaRef.current
    if (!meta) return
    const seen = new Set(docs.map(d => d.id))
    parentsRef.current = new Map()
    for (const doc of docs) {
      if (doc.deleted) {
        const local = listsRef.current.find(l => l.id === doc.id)
        if (local) {
          removeLocal(doc.id)
          notify('deleted', local.name)
        }
        setListMeta(doc.id, null)
        // Leaving a deleted list is moot (a pending delete stays: it may be our own unacknowledged write)
        const leave = metaRef.current?.pendingOps.find(o => o.kind === 'leave' && o.listId === doc.id)
        if (leave) dropOp(leave)
        continue
      }
      parentsRef.current.set(doc.id, doc)
      applyRemote(doc.id)
    }
    // A snapshot from cache may be partial (e.g. right after sign-in): only the server can say we lost access
    if (!fromCache) {
      for (const local of listsRef.current.filter(l => l.shared && !seen.has(l.id))) {
        const lm = metaRef.current?.lists[local.id]
        const notCreatedYet = lm ? lm.pendingCreate : local.shared!.ownerUid === uidRef.current
        if (notCreatedYet || hasPendingOp(local.id)) continue
        removeLocal(local.id)
        setListMeta(local.id, null)
        notify('removed', local.name)
      }
    }
    setParentsVersion(v => v + 1)
  }

  const runCycle = async () => {
    const backend = backendRef.current
    const uid = uidRef.current
    if (!backend || !uid || metaRef.current?.uid !== uid) return
    if (navigator.onLine === false) {
      setStatus('offline')
      return
    }
    const timed = <T,>(p: Promise<T>) => withTimeout(p, networkTimeoutMs)
    setStatus('syncing')
    try {
      for (const op of [...metaRef.current.pendingOps]) {
        try {
          await timed(op.kind === 'leave' ? backend.shared.leave(uid, op.listId) : backend.shared.deleteList(uid, op.listId))
        } catch (error) {
          // Refused means the intent already holds (we're not a member, or the
          // list is gone, or an earlier attempt landed): drop it, don't retry forever
          const code = (error as { code?: unknown } | null)?.code
          if (classifyError(error) !== 'auth' && code !== 'not-found') throw error
        }
        dropOp(op)
      }
      for (const { id } of listsRef.current.filter(l => l.shared)) {
        let list = listsRef.current.find(l => l.id === id)
        if (!list?.shared) continue
        let lm = metaRef.current!.lists[id]
        if (!lm) {
          if (list.shared.ownerUid !== uid) continue // someone else's list we haven't received yet
          lm = { fields: {}, people: {}, sections: {}, items: {}, pendingCreate: true }
          setListMeta(id, lm)
        }
        if (lm.pendingCreate) {
          const created = newParentDoc(list, uid, Date.now())
          const result = await timed(backend.shared.create(uid, created.doc))
          if (!listsRef.current.some(l => l.id === id)) {
            // Deleted while the create was in flight: the queued delete tombstones it next
            setListMeta(id, null)
            continue
          }
          if (result === 'exists') {
            // Already on the server (e.g. this device lost its meta): let the snapshot
            // settle the meta instead of treating every local entity as new
            setListMeta(id, null)
            applyRemote(id)
            continue
          }
          setListMeta(id, created.meta)
        }
        list = listsRef.current.find(l => l.id === id)
        if (!list) continue
        const diff = diffLocal(list, metaRef.current!.lists[id])
        if (diff.empty) continue
        await timed(backend.shared.push(uid, id, diff.parent, diff.items))
        // Apply only what was pushed: edits made meanwhile stay dirty for the next cycle
        const latest = metaRef.current?.lists[id]
        if (latest) setListMeta(id, applyMetaPatch(latest, diff.pushed))
        // A remote change that arrived while our entity was dirty was skipped: merge it again now
        applyRemote(id)
      }
      if (uidRef.current === uid) setStatus('idle')
    } catch (error) {
      if (uidRef.current === uid) fail(error)
    }
  }

  // Single-flight: a trigger during a cycle queues one more run
  const schedule = useCallback(() => {
    if (runningRef.current) {
      pendingRef.current = true
      return
    }
    runningRef.current = true
    void (async () => {
      do {
        pendingRef.current = false
        await runCycle()
      } while (pendingRef.current)
      runningRef.current = false
    })()
    // runCycle only reads refs and stable setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Signed in: make sure the meta belongs to this account, then listen to our shared lists
  useEffect(() => {
    if (!uid || !backend) return
    if (metaRef.current?.uid !== uid) saveMeta(emptySharedMeta(uid))
    const unsubscribe = backend.shared.subscribeLists(uid, onParents, fail)
    schedule()
    return () => {
      unsubscribe()
      parentsRef.current = new Map()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, backend, schedule])

  // Item listeners for every known, alive, non-archived shared list
  const itemListKey = useMemo(() => {
    void parentsVersion
    return [...parentsRef.current.keys()]
      .filter(id => !lists.find(l => l.id === id)?.archived)
      .sort()
      .join(',')
  }, [lists, parentsVersion])

  useEffect(() => {
    if (!uid || !backend || !itemListKey) return
    const ids = itemListKey.split(',')
    const unsubscribes = ids.map(id => backend.shared.subscribeItems(uid, id, items => {
      itemsRef.current.set(id, items)
      applyRemote(id)
    }, error => {
      // Losing access to one list is reported by the parent listener
      if (classifyError(error) !== 'auth') fail(error)
    }))
    return () => {
      unsubscribes.forEach(u => u())
      ids.forEach(id => itemsRef.current.delete(id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, backend, itemListKey])

  // Debounce a push after local edits to shared lists
  useEffect(() => {
    if (!uidRef.current || !lists.some(l => l.shared)) return
    const timer = setTimeout(schedule, pushDebounceMs)
    return () => clearTimeout(timer)
  }, [lists, schedule, pushDebounceMs])

  // iOS kills backgrounded PWAs: flush on hide, retry on return / reconnect
  useEffect(() => {
    window.addEventListener('online', schedule)
    window.addEventListener('pagehide', schedule)
    document.addEventListener('visibilitychange', schedule)
    return () => {
      window.removeEventListener('online', schedule)
      window.removeEventListener('pagehide', schedule)
      document.removeEventListener('visibilitychange', schedule)
    }
  }, [schedule])

  const enqueue = (kind: 'leave' | 'delete', listId: string) => {
    const meta = metaRef.current
    deleteList(listId)
    listsRef.current = listsRef.current.filter(l => l.id !== listId)
    if (!meta) return
    saveMeta({ ...meta, pendingOps: [...meta.pendingOps, { kind, listId }] })
    schedule()
  }

  const leaveList = (listId: string) => {
    if (roleOf(listId) !== 'member') return
    enqueue('leave', listId)
  }

  const deleteSharedList = (listId: string) => {
    if (roleOf(listId) !== 'owner') return
    // Even while the create may be in flight: the queued op keeps snapshots from
    // bringing the list back, and a delete of a list that never reached the server is refused and dropped
    enqueue('delete', listId)
  }

  const joinList = async (listId: string, token: string): Promise<'ok' | 'invalid' | 'network'> => {
    const backend = backendRef.current
    const uid = uidRef.current
    if (!backend || !uid) return 'network'
    try {
      await withTimeout(backend.shared.join(uid, listId, token), networkTimeoutMs)
      return 'ok'
    } catch (error) {
      return classifyError(error) === 'auth' ? 'invalid' : 'network'
    }
  }

  const dismissNotice = (id: string) => setNotices(prev => prev.filter(n => n.id !== id))

  const value: SharedSyncValue = { status, roleOf, isPendingCreate, joinList, leaveList, deleteSharedList, notices, dismissNotice }
  return <SharedSyncContext.Provider value={value}>{children}</SharedSyncContext.Provider>
}
