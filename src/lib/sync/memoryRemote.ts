import type { List } from '../../types'
import type { RemoteListDoc, RemoteStore, Tombstone } from './types'

// JSON clone mimics Firestore with ignoreUndefinedProperties (undefined fields vanish)
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

/** In-memory RemoteStore for tests; syncedAt is a monotonically increasing counter. */
export const createMemoryRemote = (): RemoteStore & { all(uid: string): RemoteListDoc[] } => {
  const users = new Map<string, Map<string, RemoteListDoc>>()
  let clock = 0
  const col = (uid: string) => {
    let c = users.get(uid)
    if (!c) users.set(uid, (c = new Map()))
    return c
  }
  return {
    all: uid => [...col(uid).values()].map(clone),
    async pullSince(uid, cursor) {
      return [...col(uid).values()].filter(d => cursor === null || d.syncedAt > cursor).map(clone)
    },
    async push(uid: string, lists: List[], tombstones: Tombstone[]) {
      const c = col(uid)
      for (const l of lists) c.set(l.id, { id: l.id, updatedAt: l.updatedAt ?? 0, deleted: false, syncedAt: ++clock, list: clone(l) })
      for (const t of tombstones) c.set(t.id, { id: t.id, updatedAt: t.deletedAt, deleted: true, syncedAt: ++clock })
    },
  }
}
