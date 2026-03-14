import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use empty base for file:// protocol compatibility in Electron
  base: '',
  resolve: {
    alias: {
      '@veil/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
})
