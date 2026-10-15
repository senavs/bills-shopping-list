import { describe, it, expect } from 'vitest'
import { formatSyncedAgo } from './formatSyncedAgo'

describe('formatSyncedAgo', () => {
  it('formats recent times in English and Portuguese', () => {
    expect(formatSyncedAgo(1_000, 11_000, 'en')).toBe('now')
    expect(formatSyncedAgo(0, 120_000, 'en')).toBe('2 minutes ago')
    expect(formatSyncedAgo(0, 120_000, 'pt-BR')).toBe('há 2 minutos')
    expect(formatSyncedAgo(0, 3 * 3_600_000, 'pt-BR')).toBe('há 3 horas')
  })
})
