import { describe, it, expect } from 'vitest'
import { applyMetaPatch, diffLocal, metaFromForm } from './diff'
import { toForm } from './convert'
import type { Item, List } from '../../types'

const item = (id: string, over: Partial<Item> = {}): Item => ({
  id, name: id, quantity: 1, unitPrice: 2, unitType: 'unit', selected: false, includeInTax: true, ...over,
})

const list = (over: Partial<List> = {}): List => ({
  id: 'L', name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 10, archived: false,
  people: [{ id: 'p1', name: 'Ana' }],
  sections: [{ id: 's1', name: 'Drinks', itemIds: ['a'], collapsed: false }],
  items: [item('a'), item('b')],
  shared: { ownerUid: 'u1', inviteToken: 'tok', memberPeople: { u1: 'p1' } },
  ...over,
})

const synced = (l: List) => metaFromForm(toForm(l, undefined))

describe('diffLocal', () => {
  it('a new list writes every field, person, section and item', () => {
    const d = diffLocal(list(), undefined)
    expect(Object.keys(d.parent.set).sort()).toEqual(
      ['currency', 'memberPeople.u1', 'name', 'people.p1', 'sections.s1', 'taxPercentage', 'type'],
    )
    expect(d.parent.set['memberPeople.u1']).toBe('p1')
    expect(d.items.map(i => i.id).sort()).toEqual(['a', 'b'])
    expect(d.empty).toBe(false)
  })

  it('nothing to write when the list matches the meta', () => {
    expect(diffLocal(list(), synced(list())).empty).toBe(true)
  })

  it('changing one item writes only that item', () => {
    const changed = list({ items: [item('a', { quantity: 3 }), item('b')] })
    const d = diffLocal(changed, synced(list()))
    expect(d.items).toEqual([expect.objectContaining({ id: 'a', quantity: 3, sectionId: 's1' })])
    expect(d.parent).toEqual({ set: {}, remove: [] })
  })

  it('deletions become tombstones and field removals', () => {
    const d = diffLocal(list({ items: [item('a')], people: [], sections: [], shared: { ownerUid: 'u1', inviteToken: 'tok', memberPeople: {} } }), synced(list()))
    expect(d.items).toContainEqual({ id: 'b', deleted: true })
    expect(d.parent.remove.sort()).toEqual(['memberPeople.u1', 'people.p1', 'sections.s1'])
    expect(d.pushed.items.b).toBeNull()
  })

  it('moving an item to another section writes it with the new sectionId', () => {
    const moved = list({ sections: [{ id: 's1', name: 'Drinks', itemIds: ['a', 'b'], collapsed: false }] })
    const d = diffLocal(moved, synced(list()))
    expect(d.items).toEqual([expect.objectContaining({ id: 'b', sectionId: 's1' })])
  })

  it('collapsing a section or archiving writes nothing', () => {
    const local = list({ archived: true, sections: [{ id: 's1', name: 'Drinks', itemIds: ['a'], collapsed: true }] })
    expect(diffLocal(local, synced(list())).empty).toBe(true)
  })
})

describe('applyMetaPatch', () => {
  it('sets new entries, removes nulls and keeps pendingCreate', () => {
    const meta = { ...synced(list()), pendingCreate: true as const }
    const next = applyMetaPatch(meta, { fields: { name: 'h' }, people: {}, sections: {}, items: { b: null, c: { hash: 'x', position: 3 } } })
    expect(next.fields.name).toBe('h')
    expect(next.items.b).toBeUndefined()
    expect(next.items.c).toEqual({ hash: 'x', position: 3 })
    expect(next.pendingCreate).toBe(true)
  })

  it('pushing the diff makes the next diff empty', () => {
    const changed = list({ name: 'Pub', items: [item('a'), item('c')] })
    const d = diffLocal(changed, synced(list()))
    expect(diffLocal(changed, applyMetaPatch(synced(list()), d.pushed)).empty).toBe(true)
  })
})
