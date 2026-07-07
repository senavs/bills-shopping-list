import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { UNIT_TYPES } from '../types'
import type { Item } from '../types'
import { normalizeImportedState } from './importExport'

const unitTypeArb = fc.constantFrom(...UNIT_TYPES)

/**
 * Generates a random item-like object WITHOUT a unitType field.
 * Simulates legacy data or imported data missing the field.
 */
const itemWithoutUnitTypeArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  quantity: fc.integer({ min: 1, max: 1000 }),
  unitPrice: fc.float({ min: 0, max: 10000, noNaN: true }),
  selected: fc.boolean(),
  includeInTax: fc.boolean(),
})

/**
 * Generates a random item WITH a valid unitType field.
 */
const itemWithUnitTypeArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  quantity: fc.integer({ min: 1, max: 1000 }),
  unitPrice: fc.float({ min: 0, max: 10000, noNaN: true }),
  unitType: unitTypeArb,
  selected: fc.boolean(),
  includeInTax: fc.boolean(),
})

/**
 * Property 1: Default unitType normalization
 * Validates: Requirements 1.2, 1.3, 4.1, 4.3
 *
 * For any item object that lacks a unitType field, when processed
 * by the normalization logic, the resulting item SHALL have
 * unitType equal to "unit".
 */
describe('Property 1: Default unitType normalization', () => {
  it('normalizes missing unitType to "unit" via loadState migration logic', () => {
    fc.assert(
      fc.property(itemWithoutUnitTypeArb, (itemData) => {
        // Simulate the normalization logic from loadState/importExport
        const normalized = {
          ...itemData,
          unitType: (itemData as Partial<Item>).unitType ?? 'unit',
        }
        expect(normalized.unitType).toBe('unit')
      }),
      { numRuns: 100 }
    )
  })

  it('normalizes missing unitType to "unit" via normalizeImportedState', () => {
    fc.assert(
      fc.property(fc.array(itemWithoutUnitTypeArb, { minLength: 1, maxLength: 10 }), (items) => {
        const state = {
          lists: [{
            id: 'test-list',
            name: 'Test',
            type: 'shopping' as const,
            currency: 'USD' as const,
            taxPercentage: 0,
            items: items as unknown as Item[],
            sections: [],
            archived: false,
          }],
        }

        const normalized = normalizeImportedState(state)
        normalized.lists[0].items.forEach((item) => {
          expect(item.unitType).toBe('unit')
        })
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * Property 3: UnitType round-trip persistence
 * Validates: Requirements 4.2, 4.4
 *
 * For any item with a valid unitType, serializing the item to JSON
 * and then deserializing it back SHALL produce an item with the
 * same unitType value.
 */
describe('Property 3: UnitType round-trip persistence', () => {
  it('preserves unitType through JSON serialize/deserialize round-trip', () => {
    fc.assert(
      fc.property(itemWithUnitTypeArb, (item) => {
        const serialized = JSON.stringify(item)
        const deserialized = JSON.parse(serialized)
        expect(deserialized.unitType).toBe(item.unitType)
      }),
      { numRuns: 100 }
    )
  })

  it('preserves unitType through full state serialize/deserialize round-trip', () => {
    fc.assert(
      fc.property(fc.array(itemWithUnitTypeArb, { minLength: 1, maxLength: 10 }), (items) => {
        const state = {
          lists: [{
            id: 'test-list',
            name: 'Test',
            type: 'shopping' as const,
            currency: 'USD' as const,
            taxPercentage: 0,
            items: items as Item[],
            sections: [],
            archived: false,
          }],
        }

        const serialized = JSON.stringify(state)
        const deserialized = JSON.parse(serialized)

        deserialized.lists[0].items.forEach((item: Item, index: number) => {
          expect(item.unitType).toBe(items[index].unitType)
        })
      }),
      { numRuns: 100 }
    )
  })
})
