import type { Item, List, Section, SharedInfo } from '../../types'
import type { ListMeta, SharedForm, SharedItem } from './types'
import { assignPositions } from './positions'

/** Local-only state that the remote form doesn't carry. */
export interface FormBase {
  id: string
  shared: SharedInfo
  archived: boolean
  updatedAt?: number
  collapsed: Record<string, boolean>
}

export const baseOf = (list: List): FormBase => ({
  id: list.id,
  shared: list.shared!,
  archived: list.archived,
  updatedAt: list.updatedAt,
  collapsed: Object.fromEntries(list.sections.map(s => [s.id, s.collapsed])),
})

const knownPositions = (meta: Record<string, { position?: number }> | undefined) => {
  const known: Record<string, number> = {}
  for (const [id, m] of Object.entries(meta ?? {})) if (m.position !== undefined) known[id] = m.position
  return known
}

/** Local list → remote form. Positions reuse the meta's known values where the order allows. */
export const toForm = (list: List, meta: ListMeta | undefined): SharedForm => {
  const people = list.people ?? []
  const peoplePos = assignPositions(people.map(p => p.id), knownPositions(meta?.people))
  const sectionPos = assignPositions(list.sections.map(s => s.id), knownPositions(meta?.sections))

  const byId = new Map(list.items.map(i => [i.id, i]))
  const knownItems = knownPositions(meta?.items)
  const items: Record<string, SharedItem> = {}
  const addGroup = (ids: string[], sectionId: string | null) => {
    const pos = assignPositions(ids, knownItems)
    for (const id of ids) items[id] = { ...byId.get(id)!, sectionId, position: pos[id] }
  }
  for (const s of list.sections) addGroup(s.itemIds.filter(id => byId.has(id) && !(id in items)), s.id)
  addGroup(list.items.map(i => i.id).filter(id => !(id in items)), null)

  return {
    fields: { name: list.name, type: list.type, currency: list.currency, taxPercentage: list.taxPercentage },
    memberPeople: { ...list.shared?.memberPeople },
    people: Object.fromEntries(people.map(p => [p.id, { name: p.name, position: peoplePos[p.id] }])),
    sections: Object.fromEntries(list.sections.map(s => [s.id, { name: s.name, position: sectionPos[s.id] }])),
    items,
  }
}

const byPosition = <T extends { position: number }>([idA, a]: [string, T], [idB, b]: [string, T]) =>
  a.position - b.position || (idA < idB ? -1 : idA > idB ? 1 : 0)

const toItem = ({ sectionId: _s, position: _p, ...item }: SharedItem): Item => item

/** Remote form → local list. Items of a missing section fall back to "Other items". */
export const fromForm = (form: SharedForm, base: FormBase): List => {
  const sections = Object.entries(form.sections).sort(byPosition)
  const groups = new Map<string | null, SharedItem[]>([[null, []], ...sections.map(([id]) => [id, []] as [string, SharedItem[]])])
  for (const [, item] of Object.entries(form.items).sort(byPosition)) {
    groups.get(item.sectionId !== null && groups.has(item.sectionId) ? item.sectionId : null)!.push(item)
  }
  const localSections: Section[] = sections.map(([id, s]) => ({
    id,
    name: s.name,
    itemIds: groups.get(id)!.map(i => i.id),
    collapsed: base.collapsed[id] ?? false,
  }))
  const items = [...sections.flatMap(([id]) => groups.get(id)!), ...groups.get(null)!].map(toItem)

  return {
    id: base.id,
    ...form.fields,
    items,
    sections: localSections,
    archived: base.archived,
    people: Object.entries(form.people).sort(byPosition).map(([id, p]) => ({ id, name: p.name })),
    updatedAt: base.updatedAt,
    shared: { ...base.shared, memberPeople: { ...form.memberPeople } },
  }
}
