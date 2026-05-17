import { contextBridge, ipcRenderer } from 'electron';
import { VeilAction, VeilState, LogLevel, IPCResult } from '@veil/shared';

contextBridge.exposeInMainWorld('veil', {
  dispatch: (action: VeilAction) => ipcRenderer.invoke('veil:action', action),
  getState: () => ipcRenderer.invoke('veil:get-state'),
  onStatePatch: (cb: (patch: Partial<VeilState>) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, patch: Partial<VeilState>) => cb(patch);
    ipcRenderer.on('veil:state-patch', listener);
    return () => ipcRenderer.removeListener('veil:state-patch', listener);
  },
  addLog: (level: LogLevel, source: string, message: string, data?: unknown) => {
    return ipcRenderer.invoke('veil:add-log', { level, source, message, data });
  },
  minimize: (): Promise<IPCResult> => ipcRenderer.invoke('veil:window-minimize'),
  maximize: (): Promise<IPCResult> => ipcRenderer.invoke('veil:window-maximize'),
  close: (): Promise<IPCResult> => ipcRenderer.invoke('veil:window-close'),
  openDebugWindow: (): Promise<IPCResult> => ipcRenderer.invoke('veil:open-debug'),
  closeDebugWindow: (): Promise<IPCResult> => ipcRenderer.invoke('veil:close-debug'),
  setShellOffset: (offset: number): Promise<IPCResult> => ipcRenderer.invoke('veil:set-shell-offset', offset),
  onShortcut: (cb: (shortcut: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, shortcut: string) => cb(shortcut);
    ipcRenderer.on('veil:shortcut', listener);
    return () => ipcRenderer.removeListener('veil:shortcut', listener);
  },
});
