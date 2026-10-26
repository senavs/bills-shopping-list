import type { SharedMeta } from './types'

const STORAGE_KEY = 'shared-sync-meta'

// Stored as { last, byUid } so switching accounts keeps each account's pending
// leaves/deletes and hashes. Earlier versions stored a single SharedMeta.
interface Stored {
  last: string
  byUid: Record<string, SharedMeta>
}

export const emptySharedMeta = (uid: string): SharedMeta => ({ uid, lists: {}, pendingOps: [] })

const normalize = (m: unknown): SharedMeta | null => {
  const meta = m as Partial<SharedMeta> | null
  if (!meta || typeof meta.uid !== 'string') return null
  return {
    uid: meta.uid,
    lists: meta.lists && typeof meta.lists === 'object' ? meta.lists : {},
    pendingOps: Array.isArray(meta.pendingOps) ? meta.pendingOps : [],
  }
}

const read = (): Stored | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    const legacy = normalize(data)
    if (legacy) return { last: legacy.uid, byUid: { [legacy.uid]: legacy } }
    if (!data || typeof data.last !== 'string' || !data.byUid || typeof data.byUid !== 'object') return null
    const byUid: Record<string, SharedMeta> = {}
    for (const m of Object.values(data.byUid)) {
      const meta = normalize(m)
      if (meta) byUid[meta.uid] = meta
    }
    return { last: data.last, byUid }
  } catch {
    return null
  }
}

/** The meta of `uid`, or of the last account used on this device. */
export const loadSharedMeta = (uid?: string): SharedMeta | null => {
  const stored = read()
  if (!stored) return null
  return stored.byUid[uid ?? stored.last] ?? null
}

export const saveSharedMeta = (meta: SharedMeta): void => {
  try {
    const stored = read()
    const next: Stored = { last: meta.uid, byUid: { ...stored?.byUid, [meta.uid]: meta } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Quota exceeded - the next successful cycle rewrites it
  }
}

export const clearSharedMeta = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
