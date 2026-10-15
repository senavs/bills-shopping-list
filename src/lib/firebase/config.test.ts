import { describe, it, expect } from 'vitest'
import { getFirebaseConfig, getGoogleClientId } from './config'

const full = {
  VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_AUTH_DOMAIN: 'p.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'p', VITE_FIREBASE_APP_ID: 'a',
  VITE_GOOGLE_CLIENT_ID: 'cid.apps.googleusercontent.com',
}

describe('getFirebaseConfig', () => {
  it('returns the config when every variable is set', () => {
    expect(getFirebaseConfig(full)).toEqual({ apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: 'a' })
  })

  it('returns null when any variable is missing or empty', () => {
    expect(getFirebaseConfig({ ...full, VITE_FIREBASE_APP_ID: '' })).toBeNull()
    expect(getFirebaseConfig({})).toBeNull()
  })

  it('requires the Google OAuth client id (redirect sign-in)', () => {
    expect(getFirebaseConfig({ ...full, VITE_GOOGLE_CLIENT_ID: undefined })).toBeNull()
  })
})

describe('getGoogleClientId', () => {
  it('reads the OAuth client id', () => {
    expect(getGoogleClientId(full)).toBe('cid.apps.googleusercontent.com')
    expect(getGoogleClientId({})).toBe('')
  })
})
