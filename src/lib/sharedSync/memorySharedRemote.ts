import { applyParentPatch } from './diff'
import type { RemoteItem, SharedParentDoc, SharedRemote } from './types'

// JSON clone mimics Firestore with ignoreUndefinedProperties (undefined fields vanish)
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const fail = (code: 'permission-denied' | 'unavailable') => Object.assign(new Error(code), { code })

const MAX_MEMBERS = 10

interface Entry { parent: SharedParentDoc; items: Record<string, RemoteItem> }

export interface MemorySharedRemote extends SharedRemote {
  peek(listId: string): Entry | undefined
  setOnline(online: boolean): void
}

/**
 * In-memory SharedRemote for tests, enforcing the same access rules as
 * firestore.rules. One instance is the server for every simulated device;
 * listeners fire asynchronously (microtask) after each write, never from cache.
 */
export const createMemorySharedRemote = (): MemorySharedRemote => {
  const lists = new Map<string, Entry>()
  const listListeners = new Set<{ uid: string; cb: (docs: SharedParentDoc[], fromCache: boolean) => void }>()
  const itemListeners = new Set<{ uid: string; listId: string; cb: (items: Record<string, RemoteItem>) => void; onError: (e: unknown) => void }>()
  let online = true

  const isMember = (uid: string, e: Entry | undefined) => !!e && e.parent.members.includes(uid)
  const docsOf = (uid: string) => [...lists.values()].filter(e => isMember(uid, e)).map(e => clone(e.parent))

  const notify = () => queueMicrotask(() => {
    for (const l of listListeners) l.cb(docsOf(l.uid), false)
    for (const l of itemListeners) {
      const e = lists.get(l.listId)
      if (isMember(l.uid, e)) l.cb(clone(e!.items))
    }
  })

  const write = async (fn: () => void) => {
    if (!online) throw fail('unavailable')
    fn()
    notify()
  }

  const editable = (uid: string, listId: string) => {
    const e = lists.get(listId)
    if (!isMember(uid, e) || e!.parent.deleted) throw fail('permission-denied')
    return e!
  }

  return {
    peek: listId => (lists.has(listId) ? clone(lists.get(listId)!) : undefined),
    setOnline: value => { online = value },

    async create(uid, doc) {
      if (!online) throw fail('unavailable')
      if (lists.has(doc.id)) {
        if (!isMember(uid, lists.get(doc.id))) throw fail('permission-denied')
        return 'exists'
      }
      if (doc.ownerUid !== uid || doc.members.length !== 1 || doc.members[0] !== uid || doc.inviteToken.length < 20) {
        throw fail('permission-denied')
      }
      lists.set(doc.id, { parent: clone(doc), items: {} })
      notify()
      return 'created'
    },

    async join(uid, listId, token) {
      if (!online) throw fail('unavailable')
      const e = lists.get(listId)
      if (isMember(uid, e)) return 'already'
      if (!e || e.parent.deleted || e.parent.inviteToken !== token || e.parent.members.length >= MAX_MEMBERS) {
        throw fail('permission-denied')
      }
      e.parent.members = [...e.parent.members, uid]
      notify()
      return 'joined'
    },

    leave: (uid, listId) => write(() => {
      const e = editable(uid, listId)
      if (e.parent.ownerUid === uid) throw fail('permission-denied')
      const { [uid]: _gone, ...memberPeople } = e.parent.memberPeople
      e.parent = { ...e.parent, members: e.parent.members.filter(m => m !== uid), memberPeople }
    }),

    deleteList: (uid, listId) => write(() => {
      const e = editable(uid, listId)
      if (e.parent.ownerUid !== uid) throw fail('permission-denied')
      e.parent = { ...e.parent, deleted: true, updatedAt: Date.now() }
    }),

    push: (uid, listId, patch, items) => write(() => {
      const e = editable(uid, listId)
      const touched = [...Object.keys(patch.set), ...patch.remove]
      const protectedField = touched.some(p => ['id', 'ownerUid', 'inviteToken', 'members', 'deleted'].includes(p.split('.')[0]))
      const otherMember = touched.some(p => p.startsWith('memberPeople.') && p !== `memberPeople.${uid}`)
      if (protectedField || otherMember) throw fail('permission-denied')
      if (touched.length > 0) e.parent = { ...applyParentPatch(e.parent, clone(patch)), updatedAt: Date.now() }
      for (const item of items) e.items[item.id] = clone(item)
    }),

    subscribeLists(uid, cb) {
      const l = { uid, cb }
      listListeners.add(l)
      queueMicrotask(() => { if (listListeners.has(l)) cb(docsOf(uid), false) })
      return () => { listListeners.delete(l) }
    },

    subscribeItems(uid, listId, cb, onError) {
      const l = { uid, listId, cb, onError }
      let cancelled = false
      queueMicrotask(() => {
        if (cancelled) return
        const e = lists.get(listId)
        if (!isMember(uid, e)) return onError(fail('permission-denied'))
        itemListeners.add(l)
        cb(clone(e!.items))
      })
      return () => { cancelled = true; itemListeners.delete(l) }
    },
  }
}
