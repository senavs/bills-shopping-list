// Fails the deploy when the Firebase/Google config is missing. Without it the
// build silently ships with sync disabled (e.g. a deploy run from a worktree,
// where the git-ignored .env.local does not exist).
import { loadEnv } from 'vite'

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_GOOGLE_CLIENT_ID',
]

// Same resolution as `vite build`: .env, .env.local, .env.production[.local] and process.env
const env = loadEnv('production', process.cwd(), 'VITE_')
const missing = REQUIRED.filter((key) => !env[key]?.trim())

if (missing.length > 0) {
  console.error(`\nDeploy aborted: missing env vars in ${process.cwd()}:`)
  for (const key of missing) console.error(`  - ${key}`)
  console.error('\nSet them in .env.local (see README.md, "Cloud sync"); without them sync is disabled in production.\n')
  process.exit(1)
}

console.log('Deploy env check passed.')
