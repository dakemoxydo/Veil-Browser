import { contextBridge, ipcRenderer } from 'electron'
import type { VeilAction, SearchResult, AudioData, VeilState } from '@veil/shared'

// ─── This is the ONLY crossing point between sandboxed renderer and main ──────
// The renderer has NO access to Node.js or Electron internals.

contextBridge.exposeInMainWorld('veil', {
  /** Dispatch an action to the main process */
  dispatch: (action: VeilAction): Promise<unknown> =>
    ipcRenderer.invoke('veil:action', action),

  /** Subscribe to state patches (immer-compatible partial updates) */
  onStatePatch: (cb: (patch: Partial<VeilState>) => void) => {
    const handler = (_: Electron.IpcRendererEvent, patch: Partial<VeilState>) => cb(patch)
    ipcRenderer.on('veil:state-patch', handler)
    return () => ipcRenderer.removeListener('veil:state-patch', handler)
  },

  /** Subscribe to audio state updates (500ms polling from main) */
  onAudioUpdate: (cb: (data: AudioData[]) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: AudioData[]) => cb(data)
    ipcRenderer.on('veil:audio', handler)
    return () => ipcRenderer.removeListener('veil:audio', handler)
  },

  /** Subscribe to command palette search results */
  onSearchResults: (cb: (results: SearchResult[]) => void) => {
    const handler = (_: Electron.IpcRendererEvent, results: SearchResult[]) => cb(results)
    ipcRenderer.on('veil:search-results', handler)
    return () => ipcRenderer.removeListener('veil:search-results', handler)
  },

  /** Subscribe to privacy stats updates */
  onPrivacyStats: (cb: (stats: { totalBlocked: number; perTab: Record<string, number> }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, stats: any) => cb(stats)
    ipcRenderer.on('veil:privacy-stats', handler)
    return () => ipcRenderer.removeListener('veil:privacy-stats', handler)
  },
})

// TypeScript augmentation lives in renderer/src/types/veil.d.ts
