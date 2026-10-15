export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

type Env = Record<string, string | undefined>

// Block body on purpose: Vite inlines import.meta.env as an object literal after
// esbuild strips parentheses, so an expression-bodied arrow would parse as a block
const defaultEnv = (): Env => {
  return import.meta.env
}

/**
 * Reads the web config from build-time env (.env.local). Null when sync is not
 * configured — the Google OAuth client id is required too (redirect sign-in).
 */
export const getFirebaseConfig = (env: Env = defaultEnv()): FirebaseConfig | null => {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
  if (!env.VITE_GOOGLE_CLIENT_ID) return null
  return Object.values(config).every(Boolean) ? (config as FirebaseConfig) : null
}

export const getGoogleClientId = (env: Env = defaultEnv()): string => env.VITE_GOOGLE_CLIENT_ID ?? ''

export const isFirebaseConfigured = (): boolean => getFirebaseConfig() !== null
