/// <reference types="vite/client" />

/** Google AdSense global array for ad initialization */
interface Window {
  adsbygoogle: object[]
}

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
}
