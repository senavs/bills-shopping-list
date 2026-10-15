import { collection, doc, getDocs, query, serverTimestamp, Timestamp, where, writeBatch } from 'firebase/firestore'
import type { RemoteStore } from '../sync/types'
import { getFirebase } from './client'
import { toRemoteDoc } from './remoteDoc'

const BATCH_LIMIT = 450 // Firestore allows 500 writes per batch

export const createFirestoreRemote = (): RemoteStore => {
  const { db } = getFirebase()
  const listsOf = (uid: string) => collection(db, 'users', uid, 'lists')

  return {
    async pullSince(uid, cursor) {
      const q = cursor === null ? listsOf(uid) : query(listsOf(uid), where('syncedAt', '>', Timestamp.fromMillis(cursor)))
      const snap = await getDocs(q)
      return snap.docs.map(d => toRemoteDoc(d.data()))
    },
    async push(uid, lists, tombstones) {
      const writes = [
        ...lists.map(l => ({ id: l.id, data: { ...l, updatedAt: l.updatedAt ?? 0, deleted: false, syncedAt: serverTimestamp() } })),
        // set() replaces the whole document, so tombstones drop the list content
        ...tombstones.map(t => ({ id: t.id, data: { id: t.id, updatedAt: t.deletedAt, deleted: true, syncedAt: serverTimestamp() } })),
      ]
      for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db)
        for (const w of writes.slice(i, i + BATCH_LIMIT)) batch.set(doc(listsOf(uid), w.id), w.data)
        await batch.commit()
      }
    },
  }
}
