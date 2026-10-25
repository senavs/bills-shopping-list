import type { Item, List } from '../../types'

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
}

/** Last synced state of one shared list, per entity. */
export interface ListMeta {
  pendingCreate?: true
  fields: Record<string, string>   // 'name' | 'type' | 'currency' | 'taxPercentage' | `memberPeople.${uid}` → hash
  people: Record<string, EntityMeta>
  sections: Record<string, EntityMeta>
  items: Record<string, EntityMeta>
}

export interface SharedMeta {
  uid: string
  lists: Record<string, ListMeta>
  pendingOps: { kind: 'leave' | 'delete'; listId: string }[]
}
