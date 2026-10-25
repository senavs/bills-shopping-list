import type { RemoteItem, SharedParentDoc } from './types'

// Firestore docs → sync types (no SDK here). Server bookkeeping (updatedAt,
// syncedAt, deleted flag of live items) must not reach the hashes.

export const toRemoteItem = (data: Record<string, unknown>): RemoteItem => {
  const { deleted, updatedAt: _u, syncedAt: _s, ...item } = data
  if (deleted === true) return { id: String(data.id), deleted: true }
  return item as unknown as RemoteItem
}

export const toParentDoc = (data: Record<string, unknown>): SharedParentDoc => {
  const { syncedAt: _s, ...doc } = data
  const parent = doc as unknown as SharedParentDoc
  return {
    ...parent,
    deleted: parent.deleted === true,
    updatedAt: Number(parent.updatedAt ?? 0),
    memberPeople: parent.memberPeople ?? {},
    people: parent.people ?? {},
    sections: parent.sections ?? {},
  }
}
