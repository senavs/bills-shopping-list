import type { Item, List } from '../../types'
import type { ItemWrite, ParentPatch } from './diff'

/** An item as stored in sharedLists/{id}/items: section membership and order live on the item. */
export interface SharedItem extends Omit<Item, 'id'> {
  id: string
  sectionId: string | null
  position: number
}

/** Item doc in Firestore: alive or tombstone. */
export type RemoteItem = SharedItem | { id: string; deleted: true }

/** Remote shape of a shared list's content (everything members edit). */
export interface SharedForm {
  fields: { name: string; type: List['type']; currency: List['currency']; taxPercentage: number }
  memberPeople: Record<string, string>
  people: Record<string, { name: string; position: number }>
  sections: Record<string, { name: string; position: number }>
  items: Record<string, SharedItem>
}

/** sharedLists/{id} document. */
export interface SharedParentDoc {
  id: string
  ownerUid: string
  inviteToken: string
  members: string[]
  deleted: boolean
  updatedAt: number
  memberPeople: SharedForm['memberPeople']
  people: SharedForm['people']
  sections: SharedForm['sections']
  name: string
  type: List['type']
  currency: List['currency']
  taxPercentage: number
}

export interface EntityMeta {
  hash: string
  position?: number
  sectionId?: string | null   // items only: a known position is reused only within the same group
}

/** Last synced state of one shared list, per entity. */
export interface ListMeta {
  pendingCreate?: true
  fields: Record<string, string>   // 'name' | 'type' | 'currency' | 'taxPercentage' | `memberPeople.${uid}` → hash
  people: Record<string, EntityMeta>
  sections: Record<string, EntityMeta>
  items: Record<string, EntityMeta>
}

/**
 * Shared-list backend. Denials reject with { code: 'permission-denied' }, network
 * failures with { code: 'unavailable' } (see classifyError). `uid` is the signed-in
 * user; Firestore takes it from auth, the in-memory fake enforces the rules with it.
 */
export interface SharedRemote {
  /** Idempotent: 'exists' (and no write) when the list is already on the server. */
  create(uid: string, doc: SharedParentDoc): Promise<'created' | 'exists'>
  join(uid: string, listId: string, token: string): Promise<'joined' | 'already'>
  /** Removes uid from members and its memberPeople entry. */
  leave(uid: string, listId: string): Promise<void>
  /** Tombstone: deleted: true. Owner only. */
  deleteList(uid: string, listId: string): Promise<void>
  push(uid: string, listId: string, parent: ParentPatch, items: ItemWrite[]): Promise<void>
  subscribeLists(uid: string, cb: (docs: SharedParentDoc[], fromCache: boolean) => void, onError: (e: unknown) => void): () => void
  subscribeItems(uid: string, listId: string, cb: (items: Record<string, RemoteItem>) => void, onError: (e: unknown) => void): () => void
}

export interface SharedMeta {
  uid: string
  lists: Record<string, ListMeta>
  pendingOps: { kind: 'leave' | 'delete'; listId: string }[]
}
