import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildAuthUrl, consumeOAuthRedirect, hasPendingToken, startOAuthRedirect, takePendingToken, type RedirectWindow } from './oauthRedirect'

const BASE = 'https://senavs.github.io/bills-shopping-list/'

const fakeWindow = (hash = ''): RedirectWindow & { assigned: string[]; replaced: string[] } => {
  const assigned: string[] = []
  const replaced: string[] = []
  return {
    assigned,
    replaced,
    location: {
      origin: 'https://senavs.github.io',
      pathname: '/bills-shopping-list/',
      hash,
      assign: (url: string) => { assigned.push(url) },
    },
    history: { replaceState: (_d: unknown, _t: string, url: string) => { replaced.push(url) } },
  }
}

beforeEach(() => {
  localStorage.clear()
  takePendingToken()
})

describe('buildAuthUrl', () => {
  it('requests an implicit-flow token back to the app URL', () => {
    const url = new URL(buildAuthUrl({ clientId: 'cid', redirectUri: BASE, state: 's1' }))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'cid', redirect_uri: BASE, response_type: 'token', scope: 'openid email', state: 's1', prompt: 'select_account',
    })
  })
})

describe('startOAuthRedirect', () => {
  it('stores state and the current route, then navigates to Google', () => {
    const win = fakeWindow('#/app')
    startOAuthRedirect('cid', win)
    expect(win.assigned).toHaveLength(1)
    const url = new URL(win.assigned[0])
    const stored = JSON.parse(localStorage.getItem('oauth-pending')!)
    expect(url.searchParams.get('state')).toBe(stored.state)
    expect(url.searchParams.get('redirect_uri')).toBe(BASE)
    expect(stored.returnHash).toBe('#/app')
  })
})

describe('consumeOAuthRedirect', () => {
  const start = () => {
    const win = fakeWindow('#/app')
    startOAuthRedirect('cid', win)
    return new URL(win.assigned[0]).searchParams.get('state')!
  }

  it('ignores normal app URLs', () => {
    const win = fakeWindow('#/lists/abc')
    expect(consumeOAuthRedirect(win)).toBeNull()
    expect(win.replaced).toEqual([])
  })

  it('keeps a valid token, strips it from the URL and restores the route', () => {
    const state = start()
    const win = fakeWindow(`#access_token=tok&token_type=Bearer&state=${state}`)
    expect(consumeOAuthRedirect(win)).toBe('token')
    expect(win.replaced).toEqual([`${BASE}#/app`])
    expect(hasPendingToken()).toBe(true)
    expect(takePendingToken()).toBe('tok')
    expect(takePendingToken()).toBeNull()
    expect(localStorage.getItem('oauth-pending')).toBeNull()
  })

  it('rejects a token whose state does not match (CSRF)', () => {
    start()
    const win = fakeWindow('#access_token=tok&state=forged')
    expect(consumeOAuthRedirect(win)).toBe('invalid')
    expect(hasPendingToken()).toBe(false)
    expect(win.replaced).toEqual([`${BASE}#/app`])
  })

  it('rejects a token when no sign-in was started', () => {
    const win = fakeWindow('#access_token=tok&state=x')
    expect(consumeOAuthRedirect(win)).toBe('invalid')
    expect(hasPendingToken()).toBe(false)
    expect(win.replaced).toEqual([BASE])
  })

  it('treats a Google error (user cancelled) as cancelled and cleans up', () => {
    const state = start()
    const win = fakeWindow(`#error=access_denied&state=${state}`)
    expect(consumeOAuthRedirect(win)).toBe('cancelled')
    expect(hasPendingToken()).toBe(false)
    expect(win.replaced).toEqual([`${BASE}#/app`])
  })

  it('does not throw when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    const win = fakeWindow('#access_token=tok&state=x')
    expect(consumeOAuthRedirect(win)).toBe('invalid')
    vi.restoreAllMocks()
  })
})
