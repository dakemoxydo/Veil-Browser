import { BrowserWindow } from 'electron'
import type { VeilState } from '@veil/shared'
import { IPC_STATE, IPC_AUDIO, IPC_SEARCH, IPC_PRIVACY } from '@veil/shared'

// ─── Interface for dependency injection ───────────────────────────────────────
export interface StateBroadcasterInterface {
  patch(patch: Partial<VeilState>): void
  emit(channel: string, data: unknown): void
}

// ─── Singleton broadcaster — imported anywhere in main process ────────────────
class _StateBroadcaster implements StateBroadcasterInterface {
  private win: BrowserWindow | null = null
  private initialized = false

  init(win: BrowserWindow) {
    this.win = win
    this.initialized = true
  }

  isInitialized(): boolean {
    return this.initialized
  }

  /** Send a partial state patch to the renderer */
  patch(patch: Partial<VeilState>) {
    if (!this.win) {
      console.warn('[StateBroadcaster] patch() called before initialization. Patch:', patch)
      return
    }
    this.win.webContents.send(IPC_STATE, patch)
  }

  emit(channel: string, data: unknown) {
    if (!this.win) {
      console.warn(`[StateBroadcaster] emit(${channel}) called before initialization.`)
      return
    }
    this.win.webContents.send(channel, data)
  }
}

export const StateBroadcaster = new _StateBroadcaster()
