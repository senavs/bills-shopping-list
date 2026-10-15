import { describe, it, expect } from 'vitest'
import { hashList } from './hash'
import type { List } from '../../types'

const list = (over: Partial<List> = {}): List => ({
  id: 'l1', name: 'Groceries', type: 'shopping', currency: 'BRL', taxPercentage: 10,
  items: [{ id: 'i1', name: 'Milk', quantity: 2, unitPrice: 5, selected: false, includeInTax: true, unitType: 'unit' }],
  sections: [{ id: 's1', name: 'Dairy', itemIds: ['i1'], collapsed: false }],
  archived: false,
  ...over,
})

describe('hashList', () => {
  it('ignores key order', () => {
    const a = list()
    const b = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(a).reverse())))
    expect(hashList(b)).toBe(hashList(a))
  })

  it('ignores updatedAt', () => {
    expect(hashList(list({ updatedAt: 1 }))).toBe(hashList(list({ updatedAt: 2 })))
  })

  it('treats undefined fields as absent (Firestore round-trip)', () => {
    const withUndefined = list({ people: undefined, isTemplate: undefined })
    const roundTripped = JSON.parse(JSON.stringify(withUndefined))
    expect(hashList(roundTripped)).toBe(hashList(withUndefined))
  })

  it('changes when content changes', () => {
    expect(hashList(list({ name: 'Other' }))).not.toBe(hashList(list()))
    const moved = list()
    moved.items[0] = { ...moved.items[0], quantity: 3 }
    expect(hashList(moved)).not.toBe(hashList(list()))
  })
})
