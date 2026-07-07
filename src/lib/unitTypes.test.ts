import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getUnitLabel, formatQuantityWithUnit } from './unitTypes'
import type { UnitType } from '../types'
import { UNIT_TYPES } from '../types'
import type { Locale } from './format'

const locales: Locale[] = ['en', 'pt-BR']

const unitTypeArb = fc.constantFrom(...UNIT_TYPES)
const localeArb = fc.constantFrom(...locales)

/**
 * Property 4: Display formatting for unit types
 * Validates: Requirements 3.1, 3.2, 3.3
 *
 * For any item with unitType != "unit" and any positive quantity,
 * formatQuantityWithUnit SHALL return a string containing both the
 * formatted quantity and the localized unit abbreviation.
 * When unitType == "unit" and quantity == 1, the function SHALL
 * return only the quantity without a unit suffix.
 */
describe('Property 4: Display formatting for unit types', () => {
  it('returns just "1" when unitType is "unit" and quantity is 1', () => {
    fc.assert(
      fc.property(localeArb, (locale) => {
        const result = formatQuantityWithUnit(1, 'unit', locale)
        expect(result).toBe('1')
      }),
      { numRuns: 100 }
    )
  })

  it('returns "{quantity} {label}" for non-"unit" types', () => {
    const nonUnitTypeArb = fc.constantFrom(...UNIT_TYPES.filter(u => u !== 'unit'))
    const positiveQuantityArb = fc.integer({ min: 1, max: 10000 })

    fc.assert(
      fc.property(positiveQuantityArb, nonUnitTypeArb, localeArb, (quantity, unitType, locale) => {
        const result = formatQuantityWithUnit(quantity, unitType, locale)
        const expectedLabel = getUnitLabel(unitType, locale)
        expect(result).toBe(`${quantity} ${expectedLabel}`)
      }),
      { numRuns: 100 }
    )
  })

  it('returns "{quantity} {label}" for unitType "unit" when quantity != 1', () => {
    // Quantities that are not exactly 1
    const nonOneQuantityArb = fc.integer({ min: 2, max: 10000 })

    fc.assert(
      fc.property(nonOneQuantityArb, localeArb, (quantity, locale) => {
        const result = formatQuantityWithUnit(quantity, 'unit', locale)
        const expectedLabel = getUnitLabel('unit', locale)
        expect(result).toBe(`${quantity} ${expectedLabel}`)
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * Property 5: Locale-aware unit labels
 * Validates: Requirements 5.2, 5.3
 *
 * For any valid UnitType value and any supported locale,
 * getUnitLabel SHALL return a non-empty string matching the
 * defined localization table.
 */
describe('Property 5: Locale-aware unit labels', () => {
  const expectedLabels: Record<Locale, Record<UnitType, string>> = {
    'en': {
      unit: 'unit',
      kg: 'kg',
      lb: 'lb',
      g: 'g',
      liter: 'liter',
      ml: 'ml',
      pack: 'pack',
      dozen: 'dozen',
      oz: 'oz',
    },
    'pt-BR': {
      unit: 'unidade',
      kg: 'kg',
      lb: 'lb',
      g: 'g',
      liter: 'litro',
      ml: 'ml',
      pack: 'pacote',
      dozen: 'dúzia',
      oz: 'oz',
    },
  }

  it('returns a non-empty string for all UnitType and locale combinations', () => {
    fc.assert(
      fc.property(unitTypeArb, localeArb, (unitType, locale) => {
        const label = getUnitLabel(unitType, locale)
        expect(label).toBeTruthy()
        expect(label.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  it('matches the expected localization table for all combinations', () => {
    fc.assert(
      fc.property(unitTypeArb, localeArb, (unitType, locale) => {
        const label = getUnitLabel(unitType, locale)
        expect(label).toBe(expectedLabels[locale][unitType])
      }),
      { numRuns: 100 }
    )
  })
})
