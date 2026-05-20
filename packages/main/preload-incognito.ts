import { contextBridge, ipcRenderer } from 'electron';
import { IPCResult } from '@veil/shared';

/**
 * Minimal preload for incognito window — no access to main window state.
 * Only exposes window controls and basic dispatch (no getState, no onStatePatch).
 */
contextBridge.exposeInMainWorld('veil', {
  minimize: (): Promise<void> => ipcRenderer.invoke('veil:window-minimize'),
  maximize: (): Promise<void> => ipcRenderer.invoke('veil:window-maximize'),
  close: (): Promise<IPCResult> => ipcRenderer.invoke('veil:window-close'),
  // addLog removed — incognito should not leak logs to debug window (A49)
  onShortcut: (callback: (shortcut: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, shortcut: string) => callback(shortcut);
    ipcRenderer.on('veil:shortcut', handler);
    return () => ipcRenderer.removeListener('veil:shortcut', handler);
  },
});
