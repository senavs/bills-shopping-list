import { defineConfig } from 'vitest/config'

// Runs against the Firestore emulator via `npm run test:rules`; excluded from `npm test`
export default defineConfig({
  test: {
    environment: 'node',
    include: ['firestore-tests/**/*.test.ts'],
  },
})
