import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'release'],
  },
  resolve: {
    alias: {
      '@veil/shared': resolve(__dirname, 'packages/shared/index.ts'),
    },
  },
});
