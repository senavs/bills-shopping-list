import type { List } from '../../types'
import { hashValue } from '../sync/hash'
import { toForm } from './convert'
import type { EntityMeta, ListMeta, RemoteItem, SharedForm } from './types'

/** Parent doc update; keys are Firestore field paths ('name', 'people.<id>', 'memberPeople.<uid>'). */
export interface ParentPatch {
  set: Record<string, unknown>
  remove: string[]
}

export type ItemWrite = RemoteItem

export interface ListMetaPatch {
  fields: Record<string, string | null>
  people: Record<string, EntityMeta | null>
  sections: Record<string, EntityMeta | null>
  items: Record<string, EntityMeta | null>
}

export interface LocalDiff {
  parent: ParentPatch
  items: ItemWrite[]
  pushed: ListMetaPatch   // apply to the meta only after the push succeeds
  empty: boolean
}

type Collection = 'people' | 'sections' | 'items'

/** Applies a ParentPatch to a parent doc like Firestore's updateDoc (paths are at most two levels deep). */
export const applyParentPatch = <T extends object>(doc: T, patch: ParentPatch): T => {
  const next: Record<string, unknown> = { ...(doc as Record<string, unknown>) }
  const write = (path: string, value: unknown, remove: boolean) => {
    const [head, key] = path.split('.')
    if (key === undefined) {
      if (remove) delete next[head]
      else next[head] = value
      return
    }
    const child = { ...(next[head] as Record<string, unknown> | undefined) }
    if (remove) delete child[key]
    else child[key] = value
    next[head] = child
  }
  for (const [path, value] of Object.entries(patch.set)) write(path, value, false)
  for (const path of patch.remove) write(path, undefined, true)
  return next as T
}

/** Field path → value of everything stored as a plain parent field. */
export const fieldValues = (form: SharedForm): Record<string, unknown> => ({
  ...form.fields,
  ...Object.fromEntries(Object.entries(form.memberPeople).map(([uid, pid]) => [`memberPeople.${uid}`, pid])),
})

const entityMeta = (value: { position: number }): EntityMeta => ({ hash: hashValue(value), position: value.position })

/** The meta that describes `form` as fully synced. */
export const metaFromForm = (form: SharedForm): ListMeta => ({
  fields: Object.fromEntries(Object.entries(fieldValues(form)).map(([k, v]) => [k, hashValue(v)])),
  people: Object.fromEntries(Object.entries(form.people).map(([id, p]) => [id, entityMeta(p)])),
  sections: Object.fromEntries(Object.entries(form.sections).map(([id, s]) => [id, entityMeta(s)])),
  items: Object.fromEntries(Object.entries(form.items).map(([id, i]) => [id, { ...entityMeta(i), sectionId: i.sectionId }])),
})

export const emptyListMeta = (): ListMeta => ({ fields: {}, people: {}, sections: {}, items: {} })

/** Writes that bring the remote from `meta` to the local list, plus the meta entries they settle. */
export const diffLocal = (list: List, meta: ListMeta | undefined): LocalDiff => {
  const base = meta ?? emptyListMeta()
  const form = toForm(list, meta)
  const target = metaFromForm(form)
  const values = fieldValues(form)
  const parent: ParentPatch = { set: {}, remove: [] }
  const items: ItemWrite[] = []
  const pushed: ListMetaPatch = { fields: {}, people: {}, sections: {}, items: {} }

  for (const [path, hash] of Object.entries(target.fields)) {
    if (base.fields[path] !== hash) {
      parent.set[path] = values[path]
      pushed.fields[path] = hash
    }
  }
  for (const path of Object.keys(base.fields)) {
    if (!(path in target.fields)) {
      parent.remove.push(path)
      pushed.fields[path] = null
    }
  }

  const collections: Collection[] = ['people', 'sections', 'items']
  for (const col of collections) {
    for (const [id, m] of Object.entries(target[col])) {
      if (base[col][id]?.hash === m.hash) continue
      if (col === 'items') items.push(form.items[id])
      else parent.set[`${col}.${id}`] = form[col][id]
      pushed[col][id] = m
    }
    for (const id of Object.keys(base[col])) {
      if (id in target[col]) continue
      if (col === 'items') items.push({ id, deleted: true })
      else parent.remove.push(`${col}.${id}`)
      pushed[col][id] = null
    }
  }

  const empty = items.length === 0 && parent.remove.length === 0 && Object.keys(parent.set).length === 0
  return { parent, items, pushed, empty }
}

const patchRecord = <T,>(current: Record<string, T>, patch: Record<string, T | null>): Record<string, T> => {
  const next = { ...current }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete next[k]
    else next[k] = v
  }
  return next
}

export const applyMetaPatch = (meta: ListMeta | undefined, patch: ListMetaPatch): ListMeta => {
  const base = meta ?? emptyListMeta()
  return {
    ...base,
    fields: patchRecord(base.fields, patch.fields),
    people: patchRecord(base.people, patch.people),
    sections: patchRecord(base.sections, patch.sections),
    items: patchRecord(base.items, patch.items),
  }
}
