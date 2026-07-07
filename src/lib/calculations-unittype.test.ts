import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { Item, List, UnitType } from '../types'
import { UNIT_TYPES } from '../types'
import { calcTotals } from './calculations'

/**
 * **Validates: Requirements 6.1, 6.2, 6.3**
 *
 * Property 6: UnitType does not affect calculations
 * For any list of items, changing the unitType of any or all items
 * (while keeping quantity and unitPrice unchanged) SHALL NOT change
 * the output of calcTotals.
 */
describe('Property 6: UnitType does not affect calculations', () => {
  const unitTypeArb = fc.constantFrom(...UNIT_TYPES) as fc.Arbitrary<UnitType>

  const itemArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    quantity: fc.float({ min: 0, max: Math.fround(1000), noNaN: true }),
    unitPrice: fc.float({ min: 0, max: Math.fround(1000), noNaN: true }),
    unitType: unitTypeArb,
    selected: fc.boolean(),
    includeInTax: fc.boolean(),
  })

  const listArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 20 }),
    type: fc.constantFrom('shopping', 'restaurant', 'bar') as fc.Arbitrary<'shopping' | 'restaurant' | 'bar'>,
    currency: fc.constantFrom('BRL', 'USD') as fc.Arbitrary<'BRL' | 'USD'>,
    taxPercentage: fc.float({ min: 0, max: Math.fround(100), noNaN: true }),
    items: fc.array(itemArbitrary, { minLength: 1, maxLength: 10 }),
    sections: fc.constant([]),
    archived: fc.boolean(),
  })

  it('changing unitType on all items does not alter totals', () => {
    fc.assert(
      fc.property(
        listArbitrary,
        fc.array(unitTypeArb, { minLength: 1, maxLength: 10 }),
        (list, newUnitTypes) => {
          const originalTotals = calcTotals(list as List)

          // Change all unitTypes to random new values
          const modifiedItems = list.items.map((item, i) => ({
            ...item,
            unitType: newUnitTypes[i % newUnitTypes.length],
          }))
          const modifiedList = { ...list, items: modifiedItems } as List

          const modifiedTotals = calcTotals(modifiedList)

          expect(modifiedTotals.totalAll).toBe(originalTotals.totalAll)
          expect(modifiedTotals.totalSelected).toBe(originalTotals.totalSelected)
          expect(modifiedTotals.totalAllWithTax).toBe(originalTotals.totalAllWithTax)
          expect(modifiedTotals.totalSelectedWithTax).toBe(originalTotals.totalSelectedWithTax)
        }
      ),
      { numRuns: 100 }
    )
  })
})
