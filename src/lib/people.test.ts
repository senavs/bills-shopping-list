import { describe, it, expect } from 'vitest'
import { initials, assignedItemCounts } from './people'
import type { Item } from '../types'

describe('initials', () => {
  it('uses the first and last word', () => {
    expect(initials('Ana Maria Souza')).toBe('AS')
    expect(initials('  bia  ')).toBe('B')
  })

  it('keeps emoji and accented letters whole', () => {
    expect(initials('Élio')).toBe('É')
    expect(initials('🍺 Caio')).toBe('🍺C')
  })

  it('falls back for an empty name', () => {
    expect(initials('   ')).toBe('?')
  })
})

describe('assignedItemCounts', () => {
  it('counts items per person', () => {
    const item = (assignedTo?: string[]): Item => ({ id: crypto.randomUUID(), name: 'x', quantity: 1, unitPrice: 1, selected: false, includeInTax: true, assignedTo })
    expect(assignedItemCounts([item(['a', 'b']), item(['a']), item()])).toEqual({ a: 2, b: 1 })
  })
})
