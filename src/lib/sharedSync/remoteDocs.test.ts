import { describe, it, expect } from 'vitest'
import { toParentDoc, toRemoteItem } from './remoteDocs'

const ts = { toMillis: () => 99 }

describe('remote doc mapping', () => {
  it('strips server bookkeeping from item docs', () => {
    expect(toRemoteItem({ id: 'a', name: 'a', quantity: 1, unitPrice: 1, selected: false, includeInTax: true, sectionId: null, position: 0, deleted: false, updatedAt: 5, syncedAt: ts }))
      .toEqual({ id: 'a', name: 'a', quantity: 1, unitPrice: 1, selected: false, includeInTax: true, sectionId: null, position: 0 })
    expect(toRemoteItem({ id: 'b', deleted: true, updatedAt: 5, syncedAt: ts })).toEqual({ id: 'b', deleted: true })
  })

  it('fills missing maps on parent docs and drops syncedAt', () => {
    const doc = toParentDoc({ id: 'L', ownerUid: 'u1', inviteToken: 't', members: ['u1'], deleted: false, updatedAt: 3, name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 0, syncedAt: ts })
    expect(doc).toEqual({ id: 'L', ownerUid: 'u1', inviteToken: 't', members: ['u1'], deleted: false, updatedAt: 3, name: 'Bar', type: 'bar', currency: 'BRL', taxPercentage: 0, memberPeople: {}, people: {}, sections: {} })
  })
})
