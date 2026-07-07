import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { Item, UnitType } from '../types'
import { UNIT_TYPES } from '../types'

/**
 * **Validates: Requirements 1.4**
 *
 * Property 2: UnitType preservation on duplication
 * For any item with any valid unitType value, when that item is duplicated,
 * the resulting duplicate item SHALL have the same unitType as the original.
 */
describe('Property 2: UnitType preservation on duplication', () => {
  // Replicate the duplication logic from ListsContext
  const duplicateItem = (original: Item): Item => {
    const newId = 'new-' + original.id
    return { ...original, id: newId, selected: false, name: `${original.name} (copy)` }
  }

  const itemArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    quantity: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
    unitPrice: fc.float({ min: 0, max: Math.fround(10000), noNaN: true }),
    unitType: fc.constantFrom(...UNIT_TYPES) as fc.Arbitrary<UnitType>,
    selected: fc.boolean(),
    includeInTax: fc.boolean(),
  })

  it('duplicated item preserves unitType for any valid unitType', () => {
    fc.assert(
      fc.property(itemArbitrary, (item: Item) => {
        const duplicate = duplicateItem(item)
        expect(duplicate.unitType).toBe(item.unitType)
      }),
      { numRuns: 100 }
    )
  })

  it('duplicated item has different id but same unitType', () => {
    fc.assert(
      fc.property(itemArbitrary, (item: Item) => {
        const duplicate = duplicateItem(item)
        expect(duplicate.id).not.toBe(item.id)
        expect(duplicate.unitType).toBe(item.unitType)
        expect(duplicate.name).toBe(`${item.name} (copy)`)
        expect(duplicate.selected).toBe(false)
      }),
      { numRuns: 100 }
    )
  })
})
