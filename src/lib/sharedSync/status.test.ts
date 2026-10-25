import { describe, it, expect } from 'vitest'
import { combineStatus } from './status'

describe('combineStatus', () => {
  it('shows the worse of personal and shared sync', () => {
    expect(combineStatus('idle', 'error')).toBe('error')
    expect(combineStatus('syncing', 'offline')).toBe('offline')
    expect(combineStatus('idle', 'syncing')).toBe('syncing')
    expect(combineStatus('error', 'idle')).toBe('error')
    expect(combineStatus('idle', 'idle')).toBe('idle')
  })

  it('disabled and signed out win', () => {
    expect(combineStatus('disabled', 'error')).toBe('disabled')
    expect(combineStatus('signedOut', 'error')).toBe('signedOut')
  })
})
