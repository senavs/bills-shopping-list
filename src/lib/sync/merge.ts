import type { List } from '../../types'
import type { MergeResult, RemoteListDoc, SyncMeta, Tombstone } from './types'
import { hashList } from './hash'

/**
 * Pure per-list merge, last edit wins (spec §4.3). `now` stands in for the
 * deletion time of lists whose deletion was not recorded in meta.deleted.
 */
export const mergeRemote = (local: List[], remote: RemoteListDoc[], meta: SyncMeta, now: number): MergeResult => {
  const byId = new Map(local.map(l => [l.id, l]))
  const order = local.map(l => l.id)
  const fromRemote = new Set<string>()
  const settled = new Set<string>()
  const wasSynced = (id: string) => id in meta.synced || id in meta.deleted
  const deletedAt = (id: string) => meta.deleted[id] ?? now
  const isDirty = (l: List) => hashList(l) !== meta.synced[l.id]

  const takeRemote = (doc: RemoteListDoc) => {
    if (!byId.has(doc.id)) order.push(doc.id)
    byId.set(doc.id, doc.list!)
    fromRemote.add(doc.id)
  }

  for (const doc of remote) {
    const l = byId.get(doc.id)
    if (l) {
      const dirty = isDirty(l)
      const localAt = l.updatedAt ?? 0
      if (doc.deleted) {
        if (!dirty || localAt <= doc.updatedAt) {
          byId.delete(doc.id)
          settled.add(doc.id)
        }
      } else if (doc.list && (!dirty || doc.updatedAt > localAt)) {
        takeRemote(doc)
      }
    } else if (wasSynced(doc.id)) {
      if (doc.deleted) {
        settled.add(doc.id)
      } else if (doc.list && doc.updatedAt > deletedAt(doc.id)) {
        takeRemote(doc)
        settled.add(doc.id)
      }
    } else if (!doc.deleted && doc.list) {
      takeRemote(doc)
    }
  }

  const lists = order.filter(id => byId.has(id)).map(id => byId.get(id)!)
  const toPush = lists.filter(l => !fromRemote.has(l.id) && isDirty(l))
  const tombstones: Tombstone[] = [...new Set([...Object.keys(meta.synced), ...Object.keys(meta.deleted)])]
    .filter(id => !byId.has(id) && !settled.has(id))
    .map(id => ({ id, deletedAt: deletedAt(id) }))

  return { lists, toPush, tombstones, settledDeletes: [...settled, ...tombstones.map(t => t.id)] }
}

/** Meta after a successful pull+push: every merged list is now in sync. */
export const nextSyncMeta = (current: SyncMeta, result: MergeResult, pulled: RemoteListDoc[]): SyncMeta => {
  const deleted = { ...current.deleted }
  for (const id of result.settledDeletes) delete deleted[id]
  const maxPulled = pulled.reduce((m, d) => Math.max(m, d.syncedAt), current.lastPulledAt ?? -Infinity)
  return {
    uid: current.uid,
    lastPulledAt: Number.isFinite(maxPulled) ? maxPulled : current.lastPulledAt,
    synced: Object.fromEntries(result.lists.map(l => [l.id, hashList(l)])),
    deleted,
  }
}

/** Records when a previously synced list vanished locally. Same object if nothing changed. */
export const recordDeletions = (meta: SyncMeta, lists: List[], now: number): SyncMeta => {
  const present = new Set(lists.map(l => l.id))
  const gone = Object.keys(meta.synced).filter(id => !present.has(id) && !(id in meta.deleted))
  if (gone.length === 0) return meta
  return { ...meta, deleted: { ...meta.deleted, ...Object.fromEntries(gone.map(id => [id, now])) } }
}
