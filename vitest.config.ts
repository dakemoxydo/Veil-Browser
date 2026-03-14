import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@veil/shared': path.resolve(__dirname, './packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/main/src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})
