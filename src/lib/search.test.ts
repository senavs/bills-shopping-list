import { describe, it, expect } from 'vitest'
import { matchesSearch, normalizeSearch } from './search'

describe('normalizeSearch', () => {
  it('lowercases, strips accents and trims', () => {
    expect(normalizeSearch('  Café ')).toBe('cafe')
  })
})

describe('matchesSearch', () => {
  it('ignores accents in the query', () => {
    expect(matchesSearch('Pão de forma', 'pao')).toBe(true)
  })
  it('ignores case and accents on both sides', () => {
    expect(matchesSearch('Pão', 'PÃO')).toBe(true)
  })
  it('an empty or blank query matches everything', () => {
    expect(matchesSearch('Leite', '')).toBe(true)
    expect(matchesSearch('Leite', '   ')).toBe(true)
  })
  it('does not match unrelated text', () => {
    expect(matchesSearch('Leite', 'cafe')).toBe(false)
  })
})
