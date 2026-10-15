import { describe, it, expect } from 'vitest'
import { classifyError, withTimeout, TimeoutError } from './errors'

describe('classifyError', () => {
  it.each([
    ['unavailable', 'offline'],
    ['deadline-exceeded', 'offline'],
    ['auth/network-request-failed', 'offline'],
    ['permission-denied', 'auth'],
    ['unauthenticated', 'auth'],
    ['auth/user-token-expired', 'auth'],
    ['resource-exhausted', 'quota'],
    ['auth/popup-closed-by-user', 'cancelled'],
    ['auth/cancelled-popup-request', 'cancelled'],
    ['weird', 'unknown'],
  ])('%s → %s', (code, kind) => {
    expect(classifyError({ code })).toBe(kind)
  })

  it('treats TimeoutError as offline', () => {
    expect(classifyError(new TimeoutError())).toBe('offline')
  })
})

describe('withTimeout', () => {
  it('resolves when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve(1), 50)).resolves.toBe(1)
  })

  it('rejects with TimeoutError when the promise hangs', async () => {
    await expect(withTimeout(new Promise(() => {}), 10)).rejects.toBeInstanceOf(TimeoutError)
  })
})
