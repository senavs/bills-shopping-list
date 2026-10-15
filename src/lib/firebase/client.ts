import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { initializeFirestore, type Firestore } from 'firebase/firestore'
import { getFirebaseConfig } from './config'

let cached: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null

export const getFirebase = () => {
  if (cached) return cached
  const config = getFirebaseConfig()
  if (!config) throw new Error('Firebase is not configured')
  const app = initializeApp(config)
  cached = { app, auth: getAuth(app), db: initializeFirestore(app, { ignoreUndefinedProperties: true }) }
  return cached
}
