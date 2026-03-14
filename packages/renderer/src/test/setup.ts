// Vitest setup file for renderer tests
// This file runs before each test file in the renderer package

import { beforeAll, vi } from 'vitest'

beforeAll(() => {
  // Mock window.veil API for tests
  Object.defineProperty(globalThis, 'window', {
    value: {
      veil: {
        dispatch: vi.fn(() => Promise.resolve()),
        onStatePatch: vi.fn(),
        onAudioUpdate: vi.fn(),
        onSearchResults: vi.fn(),
        onPrivacyStats: vi.fn(),
      },
    },
    writable: true,
  })
})
