import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@veil/shared': path.resolve(__dirname, '../shared/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome134',
    sourcemap: true,
  },
  server: {
    port: 3000,
  }
})
