import type { List } from '../../types'
import type { RemoteListDoc } from '../sync/types'

const toMillis = (v: unknown): number =>
  v && typeof (v as { toMillis?: unknown }).toMillis === 'function' ? (v as { toMillis(): number }).toMillis() : 0

/** Converts Firestore document data into a RemoteListDoc. */
export const toRemoteDoc = (data: Record<string, unknown>): RemoteListDoc => {
  const { deleted, syncedAt, ...rest } = data
  const base = { id: String(data.id), updatedAt: Number(data.updatedAt ?? 0), deleted: deleted === true, syncedAt: toMillis(syncedAt) }
  if (base.deleted) return base
  const list = rest as unknown as List
  return { ...base, list: { ...list, sections: list.sections ?? [] } }
}
