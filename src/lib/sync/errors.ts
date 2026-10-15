export class TimeoutError extends Error {
  readonly code = 'deadline-exceeded'
  constructor() {
    super('Network timeout')
  }
}

// Firestore writes never settle while offline, so every network call is bounded
export const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms)
    promise.then(
      value => { clearTimeout(timer); resolve(value) },
      error => { clearTimeout(timer); reject(error) },
    )
  })

export type ErrorClass = 'offline' | 'auth' | 'quota' | 'cancelled' | 'unknown'

export const classifyError = (error: unknown): ErrorClass => {
  const code = (error as { code?: unknown } | null)?.code
  switch (code) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'auth/network-request-failed':
      return 'offline'
    case 'permission-denied':
    case 'unauthenticated':
    case 'auth/user-token-expired':
      return 'auth'
    case 'resource-exhausted':
      return 'quota'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'cancelled'
    default:
      return 'unknown'
  }
}
