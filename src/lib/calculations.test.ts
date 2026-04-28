import { describe, it, expect } from 'vitest'
import { calcTotals } from './calculations'
import type { List } from '../types'

const createList = (overrides?: Partial<List>): List => ({
  id: '1',
  name: 'Test',
  type: 'shopping',
  currency: 'USD',
  taxPercentage: 10,
  items: [],
  sections: [],
  archived: false,
  ...overrides,
})

describe('calcTotals', () => {
  it('returns zeros for empty list', () => {
    const list = createList()
    const totals = calcTotals(list)
    
    expect(totals).toEqual({
      totalAll: 0,
      totalSelected: 0,
      totalAllWithTax: 0,
      totalSelectedWithTax: 0,
    })
  })

  it('calculates totals for all items', () => {
    const list = createList({
      items: [
        { id: '1', name: 'Item 1', quantity: 2, unitPrice: 10, selected: false, includeInTax: true },
        { id: '2', name: 'Item 2', quantity: 1, unitPrice: 5, selected: false, includeInTax: true },
      ],
    })
    
    const totals = calcTotals(list)
    expect(totals.totalAll).toBe(25)
    expect(totals.totalAllWithTax).toBe(27.5) // 25 + 2.5 (10% tax)
  })

  it('calculates totals for selected items only', () => {
    const list = createList({
      items: [
        { id: '1', name: 'Item 1', quantity: 2, unitPrice: 10, selected: true, includeInTax: true },
        { id: '2', name: 'Item 2', quantity: 1, unitPrice: 5, selected: false, includeInTax: true },
      ],
    })
    
    const totals = calcTotals(list)
    expect(totals.totalSelected).toBe(20)
    expect(totals.totalSelectedWithTax).toBe(22) // 20 + 2 (10% tax on selected)
  })

  it('excludes items from tax when includeInTax is false', () => {
    const list = createList({
      items: [
        { id: '1', name: 'Item 1', quantity: 1, unitPrice: 10, selected: true, includeInTax: true },
        { id: '2', name: 'Item 2', quantity: 1, unitPrice: 10, selected: true, includeInTax: false },
      ],
    })
    
    const totals = calcTotals(list)
    expect(totals.totalSelected).toBe(20)
    expect(totals.totalSelectedWithTax).toBe(21) // 20 + 1 (10% tax only on first item)
  })

  it('handles zero prices', () => {
    const list = createList({
      items: [
        { id: '1', name: 'Free item', quantity: 5, unitPrice: 0, selected: true, includeInTax: true },
      ],
    })
    
    const totals = calcTotals(list)
    expect(totals.totalAll).toBe(0)
    expect(totals.totalAllWithTax).toBe(0)
  })

  it('handles decimal quantities and prices', () => {
    const list = createList({
      taxPercentage: 8.5,
      items: [
        { id: '1', name: 'Item', quantity: 2.5, unitPrice: 3.99, selected: true, includeInTax: true },
      ],
    })
    
    const totals = calcTotals(list)
    expect(totals.totalSelected).toBeCloseTo(9.975, 2)
    expect(totals.totalSelectedWithTax).toBeCloseTo(10.82, 2) // 9.975 + 0.848 (8.5% tax)
  })
})
