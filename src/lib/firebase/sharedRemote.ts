import {
  arrayRemove, arrayUnion, collection, deleteField, doc, getDoc, onSnapshot, query, serverTimestamp,
  setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import type { SharedRemote } from '../sharedSync/types'
import { toParentDoc, toRemoteItem } from '../sharedSync/remoteDocs'
import { classifyError } from '../sync/errors'
import { getFirebase } from './client'

const BATCH_LIMIT = 450 // Firestore allows 500 writes per batch

/** Firestore adapter for shared lists (sharedLists/{id}, items and joins subcollections). */
export const createFirestoreSharedRemote = (): SharedRemote => {
  const { db } = getFirebase()
  const listRef = (listId: string) => doc(db, 'sharedLists', listId)
  const itemsOf = (listId: string) => collection(db, 'sharedLists', listId, 'items')

  // A non-member's get is denied even when the doc doesn't exist
  const readAsMember = async (uid: string, listId: string) => {
    try {
      const snap = await getDoc(listRef(listId))
      return snap.exists() && (snap.data().members as string[]).includes(uid)
    } catch (error) {
      if (classifyError(error) === 'auth') return false
      throw error
    }
  }

  return {
    async create(uid, parent) {
      if (await readAsMember(uid, parent.id)) return
      await setDoc(listRef(parent.id), { ...parent, syncedAt: serverTimestamp() })
    },

    async join(uid, listId, token) {
      if (await readAsMember(uid, listId)) return 'already'
      const batch = writeBatch(db)
      batch.set(doc(db, 'sharedLists', listId, 'joins', uid), { token })
      batch.update(listRef(listId), { members: arrayUnion(uid) })
      await batch.commit()
      return 'joined'
    },

    async leave(uid, listId) {
      await updateDoc(listRef(listId), { members: arrayRemove(uid), [`memberPeople.${uid}`]: deleteField() })
    },

    async deleteList(_uid, listId) {
      await updateDoc(listRef(listId), { deleted: true, updatedAt: Date.now(), syncedAt: serverTimestamp() })
    },

    async push(_uid, listId, parent, items) {
      const now = Date.now()
      const writes: ((b: ReturnType<typeof writeBatch>) => void)[] = []
      if (Object.keys(parent.set).length > 0 || parent.remove.length > 0) {
        const update: Record<string, unknown> = { ...parent.set, updatedAt: now, syncedAt: serverTimestamp() }
        for (const path of parent.remove) update[path] = deleteField()
        writes.push(b => b.update(listRef(listId), update))
      }
      for (const item of items) {
        const data = 'deleted' in item ? item : { ...item, deleted: false }
        writes.push(b => b.set(doc(itemsOf(listId), item.id), { ...data, updatedAt: now, syncedAt: serverTimestamp() }))
      }
      for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db)
        for (const w of writes.slice(i, i + BATCH_LIMIT)) w(batch)
        await batch.commit()
      }
    },

    subscribeLists(uid, cb, onError) {
      const q = query(collection(db, 'sharedLists'), where('members', 'array-contains', uid))
      return onSnapshot(q, snap => cb(snap.docs.map(d => toParentDoc(d.data())), snap.metadata.fromCache), onError)
    },

    subscribeItems(_uid, listId, cb, onError) {
      return onSnapshot(itemsOf(listId), snap => {
        cb(Object.fromEntries(snap.docs.map(d => [d.id, toRemoteItem(d.data())])))
      }, onError)
    },
  }
}
