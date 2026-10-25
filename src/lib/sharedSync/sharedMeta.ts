import type { SharedMeta } from './types'

const STORAGE_KEY = 'shared-sync-meta'

export const emptySharedMeta = (uid: string): SharedMeta => ({ uid, lists: {}, pendingOps: [] })

export const loadSharedMeta = (): SharedMeta | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const m = JSON.parse(raw)
    if (!m || typeof m.uid !== 'string') return null
    return {
      uid: m.uid,
      lists: m.lists && typeof m.lists === 'object' ? m.lists : {},
      pendingOps: Array.isArray(m.pendingOps) ? m.pendingOps : [],
    }
  } catch {
    return null
  }
}

export const saveSharedMeta = (meta: SharedMeta): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
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
