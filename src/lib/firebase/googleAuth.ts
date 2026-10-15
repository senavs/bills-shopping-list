import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut } from 'firebase/auth'
import type { AuthProvider } from '../sync/types'
import { startOAuthRedirect, takePendingToken } from '../sync/oauthRedirect'
import { getFirebase } from './client'
import { getGoogleClientId } from './config'

/**
 * Google sign-in by full-page redirect (popups never return to an installed
 * iOS PWA). Only the uid is ever read from the Firebase user.
 */
export const createGoogleAuth = async (): Promise<AuthProvider> => {
  const { auth } = getFirebase()

  // Back from Google: exchange the token captured by consumeOAuthRedirect()
  const token = takePendingToken()
  if (token) {
    try {
      await signInWithCredential(auth, GoogleAuthProvider.credential(null, token))
    } catch (error) {
      console.warn('Google sign-in could not be completed', error)
    }
  }

  return {
    // Navigates away; the promise never settles because the page unloads
    signIn: () => {
      startOAuthRedirect(getGoogleClientId())
      return new Promise<void>(() => {})
    },
    signOut: () => signOut(auth),
    onChange: cb => onAuthStateChanged(auth, user => cb(user?.uid ?? null)),
  }
}
