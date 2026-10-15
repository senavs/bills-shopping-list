export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
}

type Env = Record<string, string | undefined>

/** Reads the web config from build-time env (.env.local). Null when sync is not configured. */
export const getFirebaseConfig = (env: Env = import.meta.env as Env): FirebaseConfig | null => {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
  return Object.values(config).every(Boolean) ? (config as FirebaseConfig) : null
}

export const isFirebaseConfigured = (): boolean => getFirebaseConfig() !== null
