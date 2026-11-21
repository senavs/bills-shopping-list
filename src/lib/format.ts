/**
 * Locale-aware number and currency formatting utilities.
 * pt-BR uses comma as decimal separator (e.g., R$ 12,50)
 * en uses dot as decimal separator (e.g., $12.50)
 */

export type Locale = 'pt-BR' | 'en'

/**
 * Format a number with locale-appropriate decimal separator.
 */
export const formatNumber = (value: number, locale: Locale, decimals = 2): string => {
  return new Intl.NumberFormat(locale === 'pt-BR' ? 'pt-BR' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format a currency amount with currency-appropriate formatting.
 * BRL always uses comma as decimal separator: R$ 1.234,56
 * USD always uses dot as decimal separator: $1,234.56
 * The currency determines the format, not the app language.
 */
export const formatCurrency = (amount: number, currency: string, _locale?: Locale): string => {
  const currencyLocale = currency === 'BRL' ? 'pt-BR' : 'en-US'
  return new Intl.NumberFormat(currencyLocale, {
    style: 'currency',
    currency: currency === 'BRL' ? 'BRL' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Parse a string that may use comma or dot as decimal separator into a number.
 * Accepts both "12.50" and "12,50" regardless of locale.
 * For numbers with thousands separators (e.g., "1.234,56" or "1,234.56"),
 * it detects the format based on the last separator.
 */
export const parseLocaleNumber = (value: string): number => {
  const trimmed = value.trim()
  if (!trimmed) return NaN

  // If the string has both dot and comma, determine which is the decimal separator
  const lastDot = trimmed.lastIndexOf('.')
  const lastComma = trimmed.lastIndexOf(',')

  let normalized: string

  if (lastDot > lastComma) {
    // Dot is the decimal separator (e.g., "1,234.56" or "12.50")
    normalized = trimmed.replace(/,/g, '')
  } else if (lastComma > lastDot) {
    // Comma is the decimal separator (e.g., "1.234,56" or "12,50")
    normalized = trimmed.replace(/\./g, '').replace(',', '.')
  } else {
    // No separator or only one type - just replace comma with dot
    normalized = trimmed.replace(',', '.')
  }

  return parseFloat(normalized)
}

/** Largest number of cents digits the price input accepts (9.999.999,99). */
export const MAX_PRICE_DIGITS = 9

/** Convert an amount to integer cents, absorbing float imprecision (19.99 → 1999). */
export const toCents = (amount: number): number => Math.round(amount * 100)

/** Read every digit of a typed/pasted string as cents ("12,50" → 1250). Empty → 0. */
export const digitsToCents = (raw: string): number => {
  const digits = raw.replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : 0
}

/** Format cents as a two-decimal amount with grouping, following the currency, without symbol. */
export const formatCents = (cents: number, currency: 'BRL' | 'USD'): string =>
  new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
