import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    // Git worktrees live in .claude/worktrees and carry their own copies of the
    // test files (and sometimes node_modules), which would run twice and load a
    // second React instance.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
