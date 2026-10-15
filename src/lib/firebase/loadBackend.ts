import type { AuthProvider, RemoteStore } from '../sync/types'
import { isFirebaseConfigured } from './config'

export interface SyncBackend {
  auth: AuthProvider
  remote: RemoteStore
}

export type LoadBackend = () => Promise<SyncBackend>

// The Firebase SDK is only downloaded when this runs (sign-in or a returning signed-in user)
export const loadBackend: LoadBackend | null = isFirebaseConfigured()
  ? async () => {
      const [{ createGoogleAuth }, { createFirestoreRemote }] = await Promise.all([
        import('./googleAuth'),
        import('./firestoreRemote'),
      ])
      return { auth: await createGoogleAuth(), remote: createFirestoreRemote() }
    }
  : null
