import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLists } from './ListsContext'
import type { SyncErrorKind, SyncMeta, SyncStatus } from '../lib/sync/types'
import type { LoadBackend, SyncBackend } from '../lib/firebase/loadBackend'
import { clearSyncMeta, emptySyncMeta, loadSyncMeta, saveSyncMeta } from '../lib/sync/syncMeta'
import { mergeRemote, nextSyncMeta, recordDeletions } from '../lib/sync/merge'
import { classifyError, withTimeout } from '../lib/sync/errors'

export interface SyncContextValue {
  status: SyncStatus
  errorKind: SyncErrorKind | null
  lastSyncedAt: number | null
  prepare: () => void
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => void
}

const DISABLED: SyncContextValue = {
  status: 'disabled', errorKind: null, lastSyncedAt: null,
  prepare: () => {}, signIn: async () => {}, signOut: async () => {}, syncNow: () => {},
}

export const SyncContext = createContext<SyncContextValue>(DISABLED)

// Works without a provider (tests, unconfigured builds): sync is simply disabled
export const useSync = () => useContext(SyncContext)

type Mode = 'full' | 'push'

interface SyncProviderProps {
  children: ReactNode
  loadBackend: LoadBackend | null
  pushDebounceMs?: number
  networkTimeoutMs?: number
}

export const SyncProvider = ({ children, loadBackend, pushDebounceMs = 2000, networkTimeoutMs = 15000 }: SyncProviderProps) => {
  const { lists, replaceLists } = useLists()
  const listsRef = useRef(lists)
  listsRef.current = lists

  const metaRef = useRef<SyncMeta | null>(loadSyncMeta())
  const backendRef = useRef<SyncBackend | null>(null)
  const backendPromiseRef = useRef<Promise<SyncBackend> | null>(null)
  const uidRef = useRef<string | null>(null)
  const runningRef = useRef(false)
  const pendingRef = useRef<Mode | null>(null)

  const [status, setStatus] = useState<SyncStatus>(loadBackend ? 'signedOut' : 'disabled')
  const [errorKind, setErrorKind] = useState<SyncErrorKind | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)

  const fail = (error: unknown) => {
    const kind = classifyError(error)
    if (kind === 'offline') {
      setStatus('offline')
    } else {
      setStatus('error')
      setErrorKind(kind === 'auth' || kind === 'quota' ? kind : 'unknown')
    }
  }

  const runCycle = async (mode: Mode) => {
    const backend = backendRef.current
    const uid = uidRef.current
    if (!backend || !uid || !metaRef.current) return
    if (navigator.onLine === false) {
      setStatus('offline')
      return
    }
    setStatus('syncing')
    try {
      const pulled = mode === 'full'
        ? await withTimeout(backend.remote.pullSince(uid, metaRef.current.lastPulledAt), networkTimeoutMs)
        : []
      if (uidRef.current !== uid || !metaRef.current) return
      // Read lists after the await so edits made during the pull are merged, not overwritten
      const result = mergeRemote(listsRef.current, pulled, metaRef.current, Date.now())
      if (pulled.length > 0) replaceLists(result.lists)
      if (result.toPush.length > 0 || result.tombstones.length > 0) {
        await withTimeout(backend.remote.push(uid, result.toPush, result.tombstones), networkTimeoutMs)
      }
      // Signed out (or switched account) while the network call was in flight
      if (uidRef.current !== uid || !metaRef.current) return
      metaRef.current = nextSyncMeta(metaRef.current, result, pulled)
      saveSyncMeta(metaRef.current)
      setStatus('idle')
      setErrorKind(null)
      setLastSyncedAt(Date.now())
    } catch (error) {
      if (uidRef.current === uid) fail(error)
    }
  }

  // Single-flight: a trigger during a cycle queues one more run ('full' wins over 'push').
  // runCycle only reads refs and stable setters, so the empty deps are safe.
  const schedule = useCallback((mode: Mode) => {
    if (runningRef.current) {
      pendingRef.current = pendingRef.current === 'full' || mode === 'full' ? 'full' : 'push'
      return
    }
    runningRef.current = true
    void (async () => {
      let next: Mode | null = mode
      while (next) {
        pendingRef.current = null
        await runCycle(next)
        next = pendingRef.current
      }
      runningRef.current = false
    })()
  }, [])

  const handleUid = useCallback((uid: string | null) => {
    uidRef.current = uid
    if (!uid) {
      // A returning user whose session expired keeps their sync-meta and is asked to sign in again
      if (metaRef.current) {
        setStatus('error')
        setErrorKind('auth')
      } else {
        setStatus('signedOut')
      }
      return
    }
    if (!metaRef.current || metaRef.current.uid !== uid) {
      metaRef.current = emptySyncMeta(uid)
      saveSyncMeta(metaRef.current)
    }
    schedule('full')
  }, [schedule])

  const ensureBackend = useCallback((): Promise<SyncBackend> | null => {
    if (!loadBackend) return null
    if (!backendPromiseRef.current) {
      backendPromiseRef.current = loadBackend().then(backend => {
        backendRef.current = backend
        backend.auth.onChange(handleUid)
        return backend
      })
      backendPromiseRef.current.catch(() => { backendPromiseRef.current = null })
    }
    return backendPromiseRef.current
  }, [loadBackend, handleUid])

  const prepare = useCallback(() => { void ensureBackend()?.catch(() => {}) }, [ensureBackend])

  const signIn = useCallback(async () => {
    try {
      // Already loaded: call synchronously so the popup stays inside the tap gesture
      const backend = backendRef.current ?? await ensureBackend()
      if (!backend) return
      await backend.auth.signIn()
    } catch (error) {
      if (classifyError(error) !== 'cancelled') fail(error)
    }
  }, [ensureBackend])

  const signOut = useCallback(async () => {
    uidRef.current = null
    metaRef.current = null
    clearSyncMeta()
    setStatus('signedOut')
    setErrorKind(null)
    setLastSyncedAt(null)
    await backendRef.current?.auth.signOut()
  }, [])

  const syncNow = useCallback(() => schedule('full'), [schedule])

  // Returning signed-in user: load the SDK and resume
  useEffect(() => {
    if (metaRef.current) prepare()
  }, [prepare])

  // Record deletions as they happen, then debounce a push
  useEffect(() => {
    if (!metaRef.current) return
    const updated = recordDeletions(metaRef.current, lists, Date.now())
    if (updated !== metaRef.current) {
      metaRef.current = updated
      saveSyncMeta(updated)
    }
    if (!uidRef.current) return
    const timer = setTimeout(() => schedule('push'), pushDebounceMs)
    return () => clearTimeout(timer)
  }, [lists, schedule, pushDebounceMs])

  // iOS kills backgrounded PWAs: flush on hide, pull on return / reconnect
  useEffect(() => {
    const onVisibility = () => schedule(document.visibilityState === 'visible' ? 'full' : 'push')
    const onOnline = () => schedule('full')
    const onPageHide = () => schedule('push')
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [schedule])

  const value: SyncContextValue = loadBackend
    ? { status, errorKind, lastSyncedAt, prepare, signIn, signOut, syncNow }
    : DISABLED

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}
