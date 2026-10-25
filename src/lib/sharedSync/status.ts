import type { SyncStatus } from '../sync/types'

export type SharedSyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

const RANK: Record<SharedSyncStatus, number> = { idle: 0, syncing: 1, offline: 2, error: 3 }

/** Header status: the worse of personal and shared sync; 'disabled' / 'signedOut' win. */
export const combineStatus = (personal: SyncStatus, shared: SharedSyncStatus): SyncStatus => {
  if (personal === 'disabled' || personal === 'signedOut') return personal
  return RANK[shared] > RANK[personal] ? shared : personal
}
