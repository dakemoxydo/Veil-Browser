import { contextBridge, ipcRenderer } from 'electron';
import { VeilAction, VeilState, LogEntry, LogLevel, IPCResult } from '@veil/shared';

contextBridge.exposeInMainWorld('veil', {
  dispatch: (action: VeilAction) => ipcRenderer.invoke('veil:action', action),
  getState: () => ipcRenderer.invoke('veil:get-state'),
  onStatePatch: (cb: (patch: Partial<VeilState>) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, patch: Partial<VeilState>) => cb(patch);
    ipcRenderer.on('veil:state-patch', listener);
    return () => ipcRenderer.removeListener('veil:state-patch', listener);
  },
  onLog: (cb: (log: LogEntry) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, log: LogEntry) => cb(log);
    ipcRenderer.on('veil:log', listener);
    return () => ipcRenderer.removeListener('veil:log', listener);
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
});
