import type { UnitType } from '../types'
import type { Locale } from './format'

/**
 * Localized display labels for each unit type per locale.
 */
const labels: Record<Locale, Record<UnitType, string>> = {
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

/**
 * Get the localized label for a given unit type and locale.
 */
export const getUnitLabel = (unitType: UnitType, locale: Locale): string => {
  return labels[locale][unitType]
}

/**
 * Get all unit type options for a dropdown, with localized labels.
 */
export const getUnitTypeOptions = (locale: Locale): { value: UnitType; label: string }[] => {
  return (Object.keys(labels[locale]) as UnitType[]).map((ut) => ({
    value: ut,
    label: labels[locale][ut],
  }))
}

/**
 * Format a quantity with its unit type label for display.
 *
 * Rules:
 * - If unitType is 'unit' and quantity is 1: return just "1" (no suffix)
 * - Otherwise: return "{quantity} {localizedLabel}" (e.g., "2 kg", "500 ml")
 */
export const formatQuantityWithUnit = (quantity: number, unitType: UnitType, locale: Locale): string => {
  if (unitType === 'unit' && quantity === 1) {
    return '1'
  }
  const label = getUnitLabel(unitType, locale)
  return `${quantity} ${label}`
}
