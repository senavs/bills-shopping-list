import { describe, it, expect } from 'vitest'
import { mergeSnapshot } from './merge'
import { applyMetaPatch, applyParentPatch, diffLocal, metaFromForm } from './diff'
import { toForm } from './convert'
import type { Item, List } from '../../types'
import type { ListMeta, RemoteItem, SharedParentDoc } from './types'

const item = (id: string, over: Partial<Item> = {}): Item => ({
  id, name: id, quantity: 1, unitPrice: 2, unitType: 'unit', selected: false, includeInTax: true, ...over,
})

const base = (over: Partial<List> = {}): List => ({
  id: 'L', name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 10, archived: false,
  people: [{ id: 'p1', name: 'Ana' }],
  sections: [{ id: 's', name: 'Drinks', itemIds: ['a'], collapsed: false }],
  items: [item('a'), item('b')],
  shared: { ownerUid: 'u1', inviteToken: 'tok', memberPeople: { u1: 'p1' } },
  ...over,
})

/** A fake server: parent doc + item docs, written by applying diffs. */
const server = (l: List) => {
  const form = toForm(l, undefined)
  let parent: SharedParentDoc = {
    id: l.id, ownerUid: 'u1', inviteToken: 'tok', members: ['u1'], deleted: false, updatedAt: 1,
    ...form.fields, memberPeople: form.memberPeople, people: form.people, sections: form.sections,
  }
  const items: Record<string, RemoteItem> = { ...form.items }
  return {
    get parent() { return parent },
    items: () => ({ ...items }),
    write(local: List, meta: ListMeta): ListMeta {
      const d = diffLocal(local, meta)
      parent = applyParentPatch(parent, d.parent)
      for (const w of d.items) items[w.id] = w
      return applyMetaPatch(meta, d.pushed)
    },
  }
}

const synced = (l: List) => metaFromForm(toForm(l, undefined))

describe('mergeSnapshot', () => {
  it('a list new to this device comes entirely from the remote', () => {
    const s = server(base())
    const { list, meta } = mergeSnapshot(undefined, s.parent, s.items(), undefined)
    expect(list.items.map(i => i.id)).toEqual(['a', 'b'])
    expect(list.shared).toEqual({ ownerUid: 'u1', inviteToken: 'tok', memberPeople: { u1: 'p1' } })
    expect(diffLocal(list, meta).empty).toBe(true)
  })

  it('the echo of our own push changes nothing', () => {
    const L = base()
    const s = server(L)
    const { list, meta } = mergeSnapshot(L, s.parent, s.items(), synced(L))
    expect(list).toEqual(L)
    expect(diffLocal(list, meta).empty).toBe(true)
  })

  it('two devices adding to the same section both keep their item', () => {
    const L = base()
    const s = server(L)
    const withSection = (l: List, id: string): List => ({
      ...l, items: [...l.items, item(id)], sections: [{ ...l.sections[0], itemIds: [...l.sections[0].itemIds, id] }],
    })
    const A = withSection(L, 'i1')
    const B = withSection(L, 'i2')
    const metaA = s.write(A, synced(L))
    s.write(B, synced(L))
    const { list } = mergeSnapshot(A, s.parent, s.items(), metaA)
    expect(list.sections[0].itemIds.sort()).toEqual(['a', 'i1', 'i2'])
    expect(list.items.map(i => i.id).sort()).toEqual(['a', 'b', 'i1', 'i2'])
  })

  it('a dirty local item wins over a remote change and is pushed again', () => {
    const L = base()
    const s = server(L)
    s.write(base({ items: [item('a', { quantity: 9 }), item('b')] }), synced(L))
    const local = base({ items: [item('a', { quantity: 2 }), item('b')] })
    const { list, meta } = mergeSnapshot(local, s.parent, s.items(), synced(L))
    expect(list.items.find(i => i.id === 'a')!.quantity).toBe(2)
    expect(diffLocal(list, meta).items).toEqual([expect.objectContaining({ id: 'a', quantity: 2 })])
  })

  it('a remote tombstone removes a clean item but not a dirty one', () => {
    const L = base()
    const s = server(L)
    // Another device deletes "a"
    s.write(base({ items: [item('b')], sections: [{ id: 's', name: 'Drinks', itemIds: [], collapsed: false }] }), synced(L))
    expect(s.items().a).toEqual({ id: 'a', deleted: true })
    const clean = mergeSnapshot(L, s.parent, s.items(), synced(L)).list
    expect(clean.items.map(i => i.id)).toEqual(['b'])
    const dirty = mergeSnapshot(base({ items: [item('a', { name: 'A!' }), item('b')] }), s.parent, s.items(), synced(L)).list
    expect(dirty.items.map(i => i.id)).toEqual(['a', 'b'])
  })

  it('a local deletion stays deleted against an unchanged remote and is pushed', () => {
    const L = base()
    const s = server(L)
    const local = base({ items: [item('a')] })
    const { list, meta } = mergeSnapshot(local, s.parent, s.items(), synced(L))
    expect(list.items.map(i => i.id)).toEqual(['a'])
    expect(diffLocal(list, meta).items).toEqual([{ id: 'b', deleted: true }])
  })

  it('keeps archived and collapsed, and merges parent fields independently', () => {
    const L = base()
    const s = server(L)
    s.write(base({ taxPercentage: 15 }), synced(L))
    const local = base({ name: 'Pub', archived: true, sections: [{ id: 's', name: 'Drinks', itemIds: ['a'], collapsed: true }] })
    const { list } = mergeSnapshot(local, s.parent, s.items(), synced(L))
    expect(list).toMatchObject({ name: 'Pub', taxPercentage: 15, archived: true })
    expect(list.sections[0].collapsed).toBe(true)
  })

  it('items not loaded yet keep the local items', () => {
    const L = base()
    const s = server(L)
    const { list } = mergeSnapshot(L, { ...s.parent, name: 'New' }, null, synced(L))
    expect(list.name).toBe('New')
    expect(list.items).toEqual(L.items)
  })
})
