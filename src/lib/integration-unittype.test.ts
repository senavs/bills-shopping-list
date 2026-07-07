import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState } from './storage'
import { validateImportData, normalizeImportedState } from './importExport'
import type { AppState } from '../types'

describe('Integration: unitType end-to-end flow', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('create item with unit type → save → reload → verify persistence', () => {
    const state: AppState = {
      lists: [
        {
          id: 'list-1',
          name: 'Grocery',
          type: 'shopping',
          currency: 'BRL',
          taxPercentage: 10,
          archived: false,
          sections: [],
          items: [
            {
              id: 'item-1',
              name: 'Rice',
              quantity: 2,
              unitPrice: 5.0,
              unitType: 'kg',
              selected: false,
              includeInTax: true,
            },
            {
              id: 'item-2',
              name: 'Milk',
              quantity: 1.5,
              unitPrice: 4.0,
              unitType: 'liter',
              selected: false,
              includeInTax: true,
            },
            {
              id: 'item-3',
              name: 'Eggs',
              quantity: 1,
              unitPrice: 12.0,
              unitType: 'dozen',
              selected: false,
              includeInTax: true,
            },
            {
              id: 'item-4',
              name: 'Bread',
              quantity: 2,
              unitPrice: 3.0,
              unitType: 'pack',
              selected: true,
              includeInTax: false,
            },
            {
              id: 'item-5',
              name: 'Butter',
              quantity: 200,
              unitPrice: 0.05,
              unitType: 'g',
              selected: false,
              includeInTax: true,
            },
          ],
        },
      ],
    }

    // Save to localStorage
    saveState(state)

    // Reload from localStorage
    const loaded = loadState()

    // Assert all unitTypes are preserved
    expect(loaded.lists).toHaveLength(1)
    expect(loaded.lists[0].items).toHaveLength(5)
    expect(loaded.lists[0].items[0].unitType).toBe('kg')
    expect(loaded.lists[0].items[1].unitType).toBe('liter')
    expect(loaded.lists[0].items[2].unitType).toBe('dozen')
    expect(loaded.lists[0].items[3].unitType).toBe('pack')
    expect(loaded.lists[0].items[4].unitType).toBe('g')
  })

  it('load old-format data without unitType → verify migration applies defaults', () => {
    // Simulate old-format data in localStorage (items without unitType)
    const oldFormatData = {
      lists: [
        {
          id: 'list-old',
          name: 'Old List',
          type: 'restaurant',
          currency: 'USD',
          taxPercentage: 8,
          archived: false,
          sections: [],
          items: [
            {
              id: 'item-a',
              name: 'Beer',
              quantity: 3,
              unitPrice: 7.0,
              selected: false,
              includeInTax: true,
              // NO unitType field
            },
            {
              id: 'item-b',
              name: 'Burger',
              quantity: 1,
              unitPrice: 15.0,
              selected: true,
              includeInTax: true,
              // NO unitType field
            },
          ],
        },
      ],
    }

    // Put raw JSON in localStorage
    localStorage.setItem('app', JSON.stringify(oldFormatData))

    // Load state (migration should apply)
    const loaded = loadState()

    // Assert every item has unitType === 'unit'
    expect(loaded.lists).toHaveLength(1)
    for (const item of loaded.lists[0].items) {
      expect(item.unitType).toBe('unit')
    }
  })

  it('export list → remove unitType from JSON → import → verify defaults applied', () => {
    // Create a valid AppState with items that have unitType
    const originalState: AppState = {
      lists: [
        {
          id: 'list-export',
          name: 'Export Test',
          type: 'bar',
          currency: 'USD',
          taxPercentage: 5,
          archived: false,
          sections: [
            { id: 'sec-1', name: 'Drinks', itemIds: ['item-x', 'item-y'], collapsed: false },
          ],
          items: [
            {
              id: 'item-x',
              name: 'Wine',
              quantity: 2,
              unitPrice: 20.0,
              unitType: 'ml',
              selected: false,
              includeInTax: true,
            },
            {
              id: 'item-y',
              name: 'Whiskey',
              quantity: 1,
              unitPrice: 35.0,
              unitType: 'oz',
              selected: false,
              includeInTax: true,
            },
          ],
        },
      ],
    }

    // Serialize to JSON, parse back, remove unitType from all items
    const exported = JSON.stringify(originalState)
    const parsed = JSON.parse(exported) as AppState

    // Remove unitType from all items
    for (const list of parsed.lists) {
      for (const item of list.items) {
        delete (item as unknown as Record<string, unknown>).unitType
      }
    }

    // Validate the modified data (should still be valid since unitType is optional in validation)
    const isValid = validateImportData(parsed)
    expect(isValid).toBe(true)

    // Normalize the imported state
    const normalized = normalizeImportedState(parsed)

    // Assert all items have unitType === 'unit'
    expect(normalized.lists).toHaveLength(1)
    for (const item of normalized.lists[0].items) {
      expect(item.unitType).toBe('unit')
    }

    // Verify other item data is preserved
    expect(normalized.lists[0].items[0].name).toBe('Wine')
    expect(normalized.lists[0].items[0].quantity).toBe(2)
    expect(normalized.lists[0].items[0].unitPrice).toBe(20.0)
    expect(normalized.lists[0].items[1].name).toBe('Whiskey')
    expect(normalized.lists[0].items[1].quantity).toBe(1)
    expect(normalized.lists[0].items[1].unitPrice).toBe(35.0)

    // Verify sections are preserved
    expect(normalized.lists[0].sections).toHaveLength(1)
    expect(normalized.lists[0].sections[0].name).toBe('Drinks')
  })
})
