import { describe, it, expect } from 'vitest'
import { toRemoteDoc } from './remoteDoc'
import { hashList } from '../sync/hash'
import type { List } from '../../types'

const ts = (ms: number) => ({ toMillis: () => ms })
const list: List = {
  id: 'l1', name: 'L', type: 'bar', currency: 'USD', taxPercentage: 5, archived: false, updatedAt: 9,
  items: [{ id: 'i', name: 'Beer', quantity: 1, unitPrice: 3, selected: true, includeInTax: false, unitType: 'unit' }],
  sections: [],
}

describe('toRemoteDoc', () => {
  it('maps an active document and strips sync fields from the list', () => {
    const doc = toRemoteDoc({ ...JSON.parse(JSON.stringify(list)), deleted: false, syncedAt: ts(77) })
    expect(doc).toMatchObject({ id: 'l1', updatedAt: 9, deleted: false, syncedAt: 77 })
    expect(doc.list).not.toHaveProperty('deleted')
    expect(doc.list).not.toHaveProperty('syncedAt')
    expect(hashList(doc.list!)).toBe(hashList(list))
  })

  it('maps a tombstone without list content', () => {
    expect(toRemoteDoc({ id: 'l1', updatedAt: 4, deleted: true, syncedAt: ts(5) }))
      .toEqual({ id: 'l1', updatedAt: 4, deleted: true, syncedAt: 5 })
  })

  it('defaults missing sections and a pending server timestamp', () => {
    const noSections = JSON.parse(JSON.stringify(list))
    delete noSections.sections
    const doc = toRemoteDoc({ ...noSections, deleted: false, syncedAt: null })
    expect(doc.list!.sections).toEqual([])
    expect(doc.syncedAt).toBe(0)
  })
})
