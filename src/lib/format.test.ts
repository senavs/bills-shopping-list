import { describe, it, expect } from 'vitest'
import { toCents, digitsToCents, formatCents, MAX_PRICE_DIGITS } from './format'

describe('cents helpers', () => {
  it('caps prices at 9 digits', () => {
    expect(MAX_PRICE_DIGITS).toBe(9)
  })

  it('toCents rounds float imprecision', () => {
    expect(toCents(19.99)).toBe(1999)
    expect(toCents(0.29)).toBe(29)
    expect(toCents(3.5)).toBe(350)
  })

  it('digitsToCents keeps only digits', () => {
    expect(digitsToCents('')).toBe(0)
    expect(digitsToCents('0,015')).toBe(15)
    expect(digitsToCents('1.234,56')).toBe(123456)
    expect(digitsToCents('12,50')).toBe(1250)
  })

  it('formatCents follows the currency', () => {
    expect(formatCents(0, 'BRL')).toBe('0,00')
    expect(formatCents(0, 'USD')).toBe('0.00')
    expect(formatCents(150, 'BRL')).toBe('1,50')
    expect(formatCents(123456, 'BRL')).toBe('1.234,56')
    expect(formatCents(123456, 'USD')).toBe('1,234.56')
    expect(formatCents(999999999, 'BRL')).toBe('9.999.999,99')
  })
})
