/**
 * Google sign-in by full-page OAuth redirect (implicit flow). Popups never
 * return to an installed iOS PWA, so the app navigates to Google and Google
 * redirects back here with an access token in the URL fragment. No SDK here:
 * the token is exchanged later by googleAuth.ts via signInWithCredential.
 */

const PENDING_KEY = 'oauth-pending'
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'

export interface RedirectWindow {
  location: { origin: string; pathname: string; hash: string; assign(url: string): void }
  history: { replaceState(data: unknown, unused: string, url: string): void }
}

let pendingToken: string | null = null

export const buildAuthUrl = ({ clientId, redirectUri, state }: { clientId: string; redirectUri: string; state: string }) =>
  `${AUTH_ENDPOINT}?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'openid email',
    state,
    prompt: 'select_account',
  })}`

const appUrl = (win: RedirectWindow) => `${win.location.origin}${win.location.pathname}`

/** Leaves the app for Google's consent screen; we come back to the same route. */
export const startOAuthRedirect = (clientId: string, win: RedirectWindow = window): void => {
  const state = crypto.randomUUID()
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ state, returnHash: win.location.hash }))
  } catch {
    // Without storage the state check fails on return and sign-in is simply ignored
  }
  win.location.assign(buildAuthUrl({ clientId, redirectUri: appUrl(win), state }))
}

const readPending = (): { state?: string; returnHash?: string } => {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    localStorage.removeItem(PENDING_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/**
 * Must run before the router reads the hash. Strips the OAuth fragment from
 * the URL, checks the state (CSRF) and keeps a valid token for googleAuth.
 */
export const consumeOAuthRedirect = (win: RedirectWindow = window): 'token' | 'cancelled' | 'invalid' | null => {
  const params = new URLSearchParams(win.location.hash.slice(1))
  if (!params.has('access_token') && !params.has('error')) return null

  const pending = readPending()
  win.history.replaceState(null, '', `${appUrl(win)}${pending.returnHash ?? ''}`)

  if (!pending.state || params.get('state') !== pending.state) return 'invalid'
  if (params.has('error')) return 'cancelled'
  pendingToken = params.get('access_token')
  return 'token'
}

export const hasPendingToken = (): boolean => pendingToken !== null

/** Returns the token once; later calls get null. */
export const takePendingToken = (): string | null => {
  const token = pendingToken
  pendingToken = null
  return token
}
