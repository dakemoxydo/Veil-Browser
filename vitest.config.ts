import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'release'],
  },
  resolve: {
    alias: {
      '@veil/shared': path.resolve(__dirname, 'packages/shared/index.ts'),
    },
  },
});
