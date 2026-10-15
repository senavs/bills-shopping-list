import { describe, it, expect } from 'vitest'
import { getFirebaseConfig } from './config'

const full = {
  VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_AUTH_DOMAIN: 'p.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'p', VITE_FIREBASE_APP_ID: 'a',
}

describe('getFirebaseConfig', () => {
  it('returns the config when every variable is set', () => {
    expect(getFirebaseConfig(full)).toEqual({ apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: 'a' })
  })

  it('returns null when any variable is missing or empty', () => {
    expect(getFirebaseConfig({ ...full, VITE_FIREBASE_APP_ID: '' })).toBeNull()
    expect(getFirebaseConfig({})).toBeNull()
  })
})
