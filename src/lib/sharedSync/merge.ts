import type { List } from '../../types'
import { baseOf, fromForm, toForm, type FormBase } from './convert'
import { emptyListMeta, fieldValues, metaFromForm } from './diff'
import type { EntityMeta, ListMeta, RemoteItem, SharedForm, SharedItem, SharedParentDoc } from './types'

const isAlive = (i: RemoteItem): i is SharedItem => !('deleted' in i)

/** Merges one entity map. Clean local → remote wins; dirty local (changed or deleted since the meta) → local stays. */
const mergeEntities = <T, M extends EntityMeta | string>(
  local: Record<string, T> | null,
  localMeta: Record<string, M>,
  remote: Record<string, T>,
  remoteMeta: Record<string, M>,
  meta: Record<string, M>,
): { values: Record<string, T>; meta: Record<string, M> } => {
  const hashOf = (m: M | undefined) => (typeof m === 'string' ? m : m?.hash)
  const values: Record<string, T> = {}
  const nextMeta: Record<string, M> = {}
  const ids = new Set([...Object.keys(local ?? {}), ...Object.keys(remote), ...Object.keys(meta)])
  for (const id of ids) {
    const dirty = local !== null && hashOf(localMeta[id]) !== hashOf(meta[id])
    if (dirty) {
      if (local && id in local) values[id] = local[id]
      if (id in meta) nextMeta[id] = meta[id]
    } else if (id in remote) {
      values[id] = remote[id]
      nextMeta[id] = remoteMeta[id]
    }
  }
  return { values, meta: nextMeta }
}

const splitFields = (values: Record<string, unknown>): Pick<SharedForm, 'fields' | 'memberPeople'> => {
  const memberPeople: Record<string, string> = {}
  const fields: Record<string, unknown> = {}
  for (const [path, v] of Object.entries(values)) {
    if (path.startsWith('memberPeople.')) memberPeople[path.slice('memberPeople.'.length)] = v as string
    else fields[path] = v
  }
  return { fields: fields as SharedForm['fields'], memberPeople }
}

/**
 * Applies a remote snapshot of one shared list onto the local copy, per entity
 * (fields, people, sections, items). `items === null` means the item docs are
 * not loaded (e.g. archived list): local items and their meta are kept.
 */
export const mergeSnapshot = (
  local: List | undefined,
  parent: SharedParentDoc,
  items: Record<string, RemoteItem> | null,
  meta: ListMeta | undefined,
): { list: List; meta: ListMeta } => {
  const m = meta ?? emptyListMeta()
  const localForm = local ? toForm(local, meta) : null
  const localMeta = localForm ? metaFromForm(localForm) : emptyListMeta()

  const remoteItems = items === null
    ? localForm?.items ?? {}
    : Object.fromEntries(Object.values(items).filter(isAlive).map(i => [i.id, i]))
  const remoteForm: SharedForm = {
    fields: { name: parent.name, type: parent.type, currency: parent.currency, taxPercentage: parent.taxPercentage },
    memberPeople: parent.memberPeople ?? {},
    people: parent.people ?? {},
    sections: parent.sections ?? {},
    items: remoteItems,
  }
  const remoteMeta = metaFromForm(remoteForm)

  const fields = mergeEntities(localForm && fieldValues(localForm), localMeta.fields, fieldValues(remoteForm), remoteMeta.fields, m.fields)
  const people = mergeEntities(localForm?.people ?? null, localMeta.people, remoteForm.people, remoteMeta.people, m.people)
  const sections = mergeEntities(localForm?.sections ?? null, localMeta.sections, remoteForm.sections, remoteMeta.sections, m.sections)
  const merged = items === null
    ? { values: localForm?.items ?? {}, meta: m.items }
    : mergeEntities(localForm?.items ?? null, localMeta.items, remoteForm.items, remoteMeta.items, m.items)

  const form: SharedForm = { ...splitFields(fields.values), people: people.values, sections: sections.values, items: merged.values }
  const shared = { ownerUid: parent.ownerUid, inviteToken: parent.inviteToken }
  const formBase: FormBase = local
    ? { ...baseOf(local), shared }
    : { id: parent.id, shared, archived: false, updatedAt: parent.updatedAt, collapsed: {} }

  return {
    list: fromForm(form, formBase),
    meta: { ...m, fields: fields.meta, people: people.meta, sections: sections.meta, items: merged.meta },
  }
}
