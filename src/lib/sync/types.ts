import type { List } from '../../types'

export type SyncStatus = 'disabled' | 'signedOut' | 'idle' | 'syncing' | 'offline' | 'error'
export type SyncErrorKind = 'auth' | 'quota' | 'unknown'

export interface SyncMeta {
  uid: string
  lastPulledAt: number | null        // highest server syncedAt seen; null = never pulled
  synced: Record<string, string>     // listId → hash of the last synced version
  deleted: Record<string, number>    // listId → when it was deleted locally (epoch ms)
}

export interface RemoteListDoc {
  id: string
  updatedAt: number
  deleted: boolean
  syncedAt: number
  list?: List                        // absent on tombstones
}

export interface Tombstone {
  id: string
  deletedAt: number
}

export interface RemoteStore {
  pullSince(uid: string, cursor: number | null): Promise<RemoteListDoc[]>
  push(uid: string, lists: List[], tombstones: Tombstone[]): Promise<void>
}

export interface AuthProvider {
  signIn(): Promise<void>
  signOut(): Promise<void>
  onChange(cb: (uid: string | null) => void): () => void
}

export interface MergeResult {
  lists: List[]
  toPush: List[]
  tombstones: Tombstone[]
  settledDeletes: string[]
}
