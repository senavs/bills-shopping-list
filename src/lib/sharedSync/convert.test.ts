import { describe, it, expect } from 'vitest'
import { fromForm, toForm, baseOf } from './convert'
import type { Item, List } from '../../types'
import type { ListMeta } from './types'

const item = (id: string, over: Partial<Item> = {}): Item => ({
  id, name: id, quantity: 1, unitPrice: 2, unitType: 'unit', selected: false, includeInTax: true, ...over,
})

const list = (): List => ({
  id: 'L', name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 10, archived: true, updatedAt: 5,
  people: [{ id: 'p1', name: 'Ana' }, { id: 'p2', name: 'Bia' }],
  sections: [
    { id: 's1', name: 'Drinks', itemIds: ['b', 'a'], collapsed: true },
    { id: 's2', name: 'Food', itemIds: ['c'], collapsed: false },
  ],
  items: [item('b'), item('a', { assignedTo: ['p1'] }), item('c'), item('d'), item('e', { selected: true })],
  shared: { ownerUid: 'u1', inviteToken: 'tok', memberPeople: { u1: 'p1' } },
})

describe('toForm / fromForm', () => {
  it('round-trips a list with sections, loose items, people and local-only fields', () => {
    const L = list()
    expect(fromForm(toForm(L, undefined), baseOf(L))).toEqual(L)
  })

  it('stores section membership and order on the items', () => {
    const form = toForm(list(), undefined)
    expect(form.items.b).toMatchObject({ sectionId: 's1', position: 0 })
    expect(form.items.a).toMatchObject({ sectionId: 's1', position: 1 })
    expect(form.items.d).toMatchObject({ sectionId: null, position: 0 })
    expect(form.people.p2.position).toBe(1)
    expect(form.memberPeople).toEqual({ u1: 'p1' })
  })

  it('puts items of a missing section under "Other items"', () => {
    const L = list()
    const form = toForm(L, undefined)
    delete form.sections.s2
    const back = fromForm(form, baseOf(L))
    expect(back.sections.map(s => s.id)).toEqual(['s1'])
    // c (position 0 in s2) joins the loose group; equal positions break ties by id
    expect(back.items.map(i => i.id)).toEqual(['b', 'a', 'c', 'd', 'e'])
    expect(back.sections.flatMap(s => s.itemIds)).not.toContain('c')
  })

  it('keeps known positions when the order did not change', () => {
    const L = list()
    const meta: ListMeta = { fields: {}, people: {}, sections: {}, items: { b: { hash: 'x', position: 10, sectionId: 's1' }, a: { hash: 'y', position: 20, sectionId: 's1' } } }
    const form = toForm(L, meta)
    expect(form.items.b.position).toBe(10)
    expect(form.items.a.position).toBe(20)
  })
})
