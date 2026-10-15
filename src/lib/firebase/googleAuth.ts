import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import type { AuthProvider } from '../sync/types'
import { getFirebase } from './client'

// Only the uid is ever read from the Firebase user
export const createGoogleAuth = async (): Promise<AuthProvider> => {
  const { auth } = getFirebase()
  return {
    // Must run synchronously inside the tap handler so iOS doesn't block the popup
    signIn: () => signInWithPopup(auth, new GoogleAuthProvider()).then(() => undefined),
    signOut: () => signOut(auth),
    onChange: cb => onAuthStateChanged(auth, user => cb(user?.uid ?? null)),
  }
}
