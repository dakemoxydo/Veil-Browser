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
  onLinkHover: (cb: (url: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, url: string) => cb(url);
    ipcRenderer.on('veil:link-hover', listener);
    return () => ipcRenderer.removeListener('veil:link-hover', listener);
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
  setViewMode: (mode: 'browser' | 'settings'): Promise<IPCResult> => ipcRenderer.invoke('veil:set-view-mode', mode),
  setOverlayVisible: (visible: boolean): Promise<IPCResult> => ipcRenderer.invoke('veil:set-overlay-visible', visible),
  findInPage: (text: string, options?: { findNext?: boolean; forward?: boolean }): Promise<IPCResult> => ipcRenderer.invoke('veil:find-in-page', text, options),
  stopFind: (): Promise<IPCResult> => ipcRenderer.invoke('veil:stop-find'),
  // clearCookies removed from renderer API — use clear-browsing-data IPC instead
  version: (): Promise<{ appVersion: string; electronVersion: string; chromeVersion: string; nodeVersion: string; v8Version: string; os: string; osVersion: string }> => ipcRenderer.invoke('veil:version'),
  historyList: (): Promise<{ entries: { id: string; url: string; title: string; timestamp: number }[] }> => ipcRenderer.invoke('veil:history-list'),
  historyClear: (): Promise<IPCResult> => ipcRenderer.invoke('veil:history-clear'),
  onShortcut: (cb: (shortcut: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, shortcut: string) => cb(shortcut);
    ipcRenderer.on('veil:shortcut', listener);
    return () => ipcRenderer.removeListener('veil:shortcut', listener);
  },
  searchSuggestions: (query: string) => ipcRenderer.invoke('veil:search-suggestions', query),
  openIncognito: (): Promise<IPCResult> => ipcRenderer.invoke('veil:incognito-open'),
  closeIncognito: (): Promise<IPCResult> => ipcRenderer.invoke('veil:incognito-close'),
  onZoomChange: (cb: (level: number) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, level: number) => cb(level);
    ipcRenderer.on('veil:zoom-change', listener);
    return () => ipcRenderer.removeListener('veil:zoom-change', listener);
  },
  onFullscreenChange: (cb: (isFullscreen: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, isFullscreen: boolean) => cb(isFullscreen);
    ipcRenderer.on('veil:fullscreen-change', listener);
    return () => ipcRenderer.removeListener('veil:fullscreen-change', listener);
  },
  privacyStats: () => ipcRenderer.invoke('veil:privacy-stats'),
  clearBrowsingData: (options: { timeRange: string; clearHistory: boolean; clearCookies: boolean; clearCache: boolean }) => ipcRenderer.invoke('veil:clear-browsing-data', options),
  cookieList: (domain?: string) => ipcRenderer.invoke('veil:cookie-list', domain),
  cookieDelete: (name: string, domain: string) => ipcRenderer.invoke('veil:cookie-delete', name, domain),
  setDefaultBrowser: () => ipcRenderer.invoke('veil:set-default-browser'),
  toggleReaderMode: () => ipcRenderer.invoke('veil:toggle-reader-mode'),
  savePage: () => ipcRenderer.invoke('veil:save-page'),
  setZoomLevel: (level: number) => ipcRenderer.invoke('veil:set-zoom-level', level),
  // Phase 6: Profile management
  profileList: () => ipcRenderer.invoke('veil:profile-list'),
  profileCreate: (name: string) => ipcRenderer.invoke('veil:profile-create', name),
  profileSwitch: (id: string) => ipcRenderer.invoke('veil:profile-switch', id),
  profileDelete: (id: string) => ipcRenderer.invoke('veil:profile-delete', id),
  // Phase 6: Custom adblock lists
  adblockGetCustomLists: () => ipcRenderer.invoke('veil:adblock-custom-lists'),
  adblockAddCustomList: (url: string) => ipcRenderer.invoke('veil:adblock-add-list', url),
  adblockRemoveCustomList: (url: string) => ipcRenderer.invoke('veil:adblock-remove-list', url),
  // Phase 6: Password manager
  passwordUnlock: (masterPassword: string) => ipcRenderer.invoke('veil:password-unlock', masterPassword),
  passwordLock: () => ipcRenderer.invoke('veil:password-lock'),
  passwordList: () => ipcRenderer.invoke('veil:password-list'),
  passwordGet: (id: string) => ipcRenderer.invoke('veil:password-get', id),
  passwordAdd: (credential: { url: string; username: string; password: string; title: string }) => ipcRenderer.invoke('veil:password-add', credential),
  passwordUpdate: (id: string, updates: Partial<{ url: string; username: string; password: string; title: string }>) => ipcRenderer.invoke('veil:password-update', id, updates),
  passwordDelete: (id: string) => ipcRenderer.invoke('veil:password-delete', id),
  // Phase 6: Proxy
  proxySetConfig: (config: import('@veil/shared').ProxySettings) => ipcRenderer.invoke('veil:proxy-set-config', config),
});
