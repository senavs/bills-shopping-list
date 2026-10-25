import type { AuthProvider, RemoteStore } from '../sync/types'
import type { SharedRemote } from '../sharedSync/types'
import { isFirebaseConfigured } from './config'

export interface SyncBackend {
  auth: AuthProvider
  remote: RemoteStore
  shared: SharedRemote
}

export type LoadBackend = () => Promise<SyncBackend>

// The Firebase SDK is only downloaded when this runs (sign-in or a returning signed-in user)
export const loadBackend: LoadBackend | null = isFirebaseConfigured()
  ? async () => {
      const [{ createGoogleAuth }, { createFirestoreRemote }, { createFirestoreSharedRemote }] = await Promise.all([
        import('./googleAuth'),
        import('./firestoreRemote'),
        import('./sharedRemote'),
      ])
      return { auth: await createGoogleAuth(), remote: createFirestoreRemote(), shared: createFirestoreSharedRemote() }
    }
  : null
