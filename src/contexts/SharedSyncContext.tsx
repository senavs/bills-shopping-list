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
    const merged = mergeSnapshot(local, parent, itemsRef.current.get(listId) ?? null, meta.lists[listId])
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
        await timed(op.kind === 'leave' ? backend.shared.leave(uid, op.listId) : backend.shared.deleteList(uid, op.listId))
        const meta = metaRef.current!
        const { [op.listId]: _done, ...rest } = meta.lists
        saveMeta({ ...meta, lists: rest, pendingOps: meta.pendingOps.filter(o => o !== op && !(o.kind === op.kind && o.listId === op.listId)) })
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
          await timed(backend.shared.create(uid, created.doc))
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
    if (isPendingCreate(listId)) {
      // Never reached the server: nothing to tombstone
      deleteList(listId)
      listsRef.current = listsRef.current.filter(l => l.id !== listId)
      setListMeta(listId, null)
      return
    }
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
