import type { SyncMeta } from './types'

const STORAGE_KEY = 'sync-meta'

export const emptySyncMeta = (uid: string): SyncMeta => ({ uid, lastPulledAt: null, synced: {}, deleted: {} })

export const loadSyncMeta = (): SyncMeta | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const m = JSON.parse(raw)
    if (!m || typeof m.uid !== 'string') return null
    return {
      uid: m.uid,
      lastPulledAt: typeof m.lastPulledAt === 'number' ? m.lastPulledAt : null,
      synced: m.synced && typeof m.synced === 'object' ? m.synced : {},
      deleted: m.deleted && typeof m.deleted === 'object' ? m.deleted : {},
    }
  } catch {
    return null
  }
}

export const saveSyncMeta = (meta: SyncMeta): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta))
  } catch {
    // Quota exceeded - the next successful cycle rewrites it
  }
}

export const clearSyncMeta = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
