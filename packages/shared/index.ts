/**
 * Heuristic URL detection — returns true if input looks like a URL rather than a search query.
 * Rules: no spaces; contains ://, or matches domain pattern, or is localhost/IP.
 */
export function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;

  // Explicit scheme
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return true;

  // localhost with optional port/path
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) return true;

  // IP addresses (v4)
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(trimmed)) return true;

  // IPv6 bracket notation
  if (/^\[[\da-fA-F:]+\](:\d+)?(\/.*)?$/.test(trimmed)) return true;

  // Domain-like: labels separated by dots, final label >= 2 letters, optional port/path
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed)) return true;

  return false;
}

export type SearchEngine = 'duckduckgo' | 'google' | 'brave' | 'custom';

export function getSearchUrl(query: string, engine: SearchEngine, customUrl?: string): string {
  const encoded = encodeURIComponent(query);
  switch (engine) {
    case 'google': return `https://www.google.com/search?q=${encoded}`;
    case 'brave': return `https://search.brave.com/search?q=${encoded}`;
    case 'custom': {
      if (!customUrl) return `https://duckduckgo.com/?q=${encoded}`;
      // Validate custom URL uses safe protocol
      try {
        const parsed = new URL(customUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          return `https://duckduckgo.com/?q=${encoded}`;
        }
      } catch {
        return `https://duckduckgo.com/?q=${encoded}`;
      }
      // If URL already contains a query placeholder (ends with =, ?, or &), just append
      if (/[?&=]$/.test(customUrl)) {
        return `${customUrl}${encoded}`;
      }
      // Otherwise, add ?q= separator
      const separator = customUrl.includes('?') ? '&' : '?';
      return `${customUrl}${separator}q=${encoded}`;
    }
    default: return `https://duckduckgo.com/?q=${encoded}`;
  }
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'ACTION' | 'DEBUG';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
  data?: unknown;
}

export interface TabInfo {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  favicon?: string;
  loadProgress: number;
  pinned?: boolean;
  muted?: boolean;
  isPlayingAudio?: boolean;
  groupId?: string;
}

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export interface ClearDataOptions {
  timeRange: 'hour' | 'day' | 'week' | 'all';
  clearHistory: boolean;
  clearCookies: boolean;
  clearCache: boolean;
}

export interface BookmarkItem {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  dateAdded: number;
  folder?: string;
}

export interface DownloadItem {
  id: string;
  filename: string;
  url: string;
  path: string;
  totalBytes: number;
  receivedBytes: number;
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
  startTime: number;
}

export interface ProxySettings {
  mode: 'direct' | 'system' | 'manual';
  host?: string;
  port?: number;
  protocol?: 'http' | 'socks5';
}

export interface VeilSettings {
  general: {
    homepage: string;
    searchEngine: SearchEngine;
    customSearchUrl: string;
    downloadPath: string;
    restoreTabsOnLaunch: boolean;
  };
  privacy: {
    adblockEnabled: boolean;
    blockTrackers: boolean;
    fingerprintProtection: boolean;
    doNotTrack: boolean;
    blockThirdPartyCookies: boolean;
    clearCookiesOnStart: boolean;
    httpsUpgrade: boolean;
    customAdblockLists: string[];
  };
  appearance: {
    showBookmarksBar: boolean;
    theme: 'dark' | 'light' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    accentColor: string;
    compactMode: boolean;
  };
  proxy: ProxySettings;
}

export const DEFAULT_SETTINGS: VeilSettings = {
  general: {
    homepage: 'https://duckduckgo.com',
    searchEngine: 'duckduckgo',
    customSearchUrl: '',
    downloadPath: '',
    restoreTabsOnLaunch: true,
  },
  privacy: {
    adblockEnabled: true,
    blockTrackers: true,
    fingerprintProtection: true,
    doNotTrack: true,
    blockThirdPartyCookies: true,
    clearCookiesOnStart: false,
    httpsUpgrade: true,
    customAdblockLists: [],
  },
  appearance: {
    showBookmarksBar: true,
    theme: 'dark',
    fontSize: 'medium',
    accentColor: '#8AB4F8',
    compactMode: false,
  },
  proxy: {
    mode: 'system',
  },
};

export interface VeilState {
  tabs: TabInfo[];
  activeTabId: string | null;
  recentlyClosed: TabInfo[];
  tabGroups: TabGroup[];
  privacyStats: {
    blockedTotal: number;
    blockedCurrent: number;
    blockedAds: number;
    blockedTrackers: number;
    httpsUpgrades: number;
    cookiesBlocked: number;
  };
  logs: LogEntry[];
  bookmarks: BookmarkItem[];
  downloads: DownloadItem[];
  settings: VeilSettings;
  certExceptions: { fingerprint: string; hostname: string }[];
  scriptBlockList: { hostname: string; blocked: boolean }[];
  zoomLevel: number;
}

export type VeilAction =
  | { type: 'TAB_NEW'; payload: { url?: string } }
  | { type: 'TAB_CLOSE'; payload: { id: string } }
  | { type: 'TAB_RESTORE' }
  | { type: 'TAB_PIN'; payload: { id: string } }
  | { type: 'TAB_MUTE'; payload: { id: string } }
  | { type: 'TAB_CLOSE_OTHERS'; payload: { id: string } }
  | { type: 'TAB_CLOSE_TO_RIGHT'; payload: { id: string } }
  | { type: 'TAB_REORDER'; payload: { sourceId: string; targetId: string } }
  | { type: 'TAB_NAVIGATE'; payload: { id: string; url: string } }
  | { type: 'TAB_FOCUS'; payload: { id: string } }
  | { type: 'TAB_GO_BACK'; payload: { id: string } }
  | { type: 'TAB_GO_FORWARD'; payload: { id: string } }
  | { type: 'TAB_RELOAD'; payload: { id: string } }
  | { type: 'TAB_GO_HOME'; payload: { id: string } }
  | { type: 'EXT_LOAD_UNPACKED'; payload: { path: string } }
  | { type: 'EXT_DIALOG_OPEN' }
  | { type: 'ADBLOCK_TOGGLE' }
  | { type: 'BOOKMARK_ADD'; payload: { url: string; title: string; folder?: string } }
  | { type: 'BOOKMARK_REMOVE'; payload: { id: string } }
  | { type: 'HISTORY_CLEAR' }
  | { type: 'DOWNLOAD_CANCEL'; payload: { id: string } }
  | { type: 'DOWNLOAD_OPEN'; payload: { id: string } }
  | { type: 'DOWNLOAD_SHOW_IN_FOLDER'; payload: { id: string } }
  | { type: 'SETTINGS_UPDATE'; payload: Partial<VeilSettings> }
  | { type: 'BOOKMARK_REORDER'; payload: { sourceId: string; targetId: string } }
  | { type: 'BOOKMARK_UPDATE'; payload: { id: string; title?: string; folder?: string } }
  | { type: 'TAB_GROUP_CREATE'; payload: { name: string; color: string } }
  | { type: 'TAB_GROUP_DELETE'; payload: { id: string } }
  | { type: 'TAB_GROUP_RENAME'; payload: { id: string; name: string } }
  | { type: 'TAB_GROUP_TOGGLE'; payload: { id: string } }
  | { type: 'TAB_MOVE_TO_GROUP'; payload: { tabId: string; groupId: string | null } }
  | { type: 'DOWNLOAD_CLEAR_HISTORY' }
  | { type: 'HISTORY_CLEAR_SINCE'; payload: { timestamp: number } }
  | { type: 'CERT_EXCEPTION_ADD'; payload: { fingerprint: string; hostname: string } }
  | { type: 'CERT_EXCEPTION_REMOVE'; payload: { fingerprint: string } }
  | { type: 'SCRIPT_BLOCK_TOGGLE'; payload: { hostname: string } }
  | { type: 'SCRIPT_BLOCK_SITE'; payload: { hostname: string; blocked: boolean } };

export interface SuggestionItem {
  url: string;
  title: string;
  source: 'history' | 'bookmark';
}

export interface Credential {
  id: string;
  url: string;
  username: string;
  password: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface CredentialMeta {
  id: string;
  url: string;
  username: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Profile {
  id: string;
  name: string;
  dataDir: string;
  isDefault: boolean;
}

export interface IPCResult {
  success: boolean;
  error?: string;
}

export interface VeilAPI {
  dispatch: (action: VeilAction) => Promise<void>;
  getState: () => Promise<VeilState | null>;
  onStatePatch: (cb: (patch: Partial<VeilState>) => void) => () => void;
  onLinkHover: (cb: (url: string) => void) => () => void;
  addLog: (level: LogLevel, source: string, message: string, data?: unknown) => Promise<void>;
  minimize: () => Promise<IPCResult>;
  maximize: () => Promise<IPCResult>;
  close: () => Promise<IPCResult>;
  openDebugWindow: () => Promise<IPCResult>;
  closeDebugWindow: () => Promise<IPCResult>;
  setShellOffset: (offset: number) => Promise<IPCResult>;
  setViewMode: (mode: 'browser' | 'settings') => Promise<IPCResult>;
  setOverlayVisible: (visible: boolean) => Promise<IPCResult>;
  findInPage: (text: string, options?: { findNext?: boolean; forward?: boolean }) => Promise<IPCResult>;
  stopFind: () => Promise<IPCResult>;
  clearCookies: () => Promise<IPCResult>;
  version: () => Promise<{ appVersion: string; electronVersion: string; chromeVersion: string; nodeVersion: string; v8Version: string; os: string; osVersion: string }>;
  historyList: () => Promise<{ entries: { id: string; url: string; title: string; timestamp: number }[] }>;
  historyClear: () => Promise<IPCResult>;
  onShortcut: (cb: (shortcut: string) => void) => () => void;
  searchSuggestions: (query: string) => Promise<SuggestionItem[]>;
  openIncognito: () => Promise<IPCResult>;
  closeIncognito: () => Promise<IPCResult>;
  onZoomChange: (cb: (level: number) => void) => () => void;
  onFullscreenChange: (cb: (isFullscreen: boolean) => void) => () => void;
  privacyStats: () => Promise<{ blockedAds: number; blockedTrackers: number; httpsUpgrades: number; cookiesBlocked: number; topBlockedDomains: { domain: string; count: string }[] }>;
  clearBrowsingData: (options: ClearDataOptions) => Promise<IPCResult>;
  cookieList: (domain?: string) => Promise<{ name: string; value: string; domain: string; path: string; expires: number; secure: boolean; httpOnly: boolean }[]>;
  cookieDelete: (name: string, domain: string) => Promise<IPCResult>;
  setDefaultBrowser: () => Promise<IPCResult>;
  toggleReaderMode: () => Promise<IPCResult>;
  savePage: () => Promise<IPCResult>;
  setZoomLevel: (level: number) => Promise<IPCResult>;
  // Profile management
  profileList: () => Promise<Profile[]>;
  profileCreate: (name: string) => Promise<IPCResult>;
  profileSwitch: (id: string) => Promise<IPCResult>;
  profileDelete: (id: string) => Promise<IPCResult>;
  // Custom adblock lists
  adblockGetCustomLists: () => Promise<string[]>;
  adblockAddCustomList: (url: string) => Promise<IPCResult>;
  adblockRemoveCustomList: (url: string) => Promise<IPCResult>;
  // Password manager
  passwordUnlock: (masterPassword: string) => Promise<IPCResult>;
  passwordLock: () => Promise<IPCResult>;
  passwordList: () => Promise<CredentialMeta[]>;
  passwordGet: (id: string) => Promise<{ success: boolean; credential?: Credential; error?: string }>;
  passwordAdd: (credential: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>) => Promise<IPCResult>;
  passwordUpdate: (id: string, credential: Partial<Omit<Credential, 'id' | 'createdAt'>>) => Promise<IPCResult>;
  passwordDelete: (id: string) => Promise<IPCResult>;
  // Proxy
  proxySetConfig: (config: ProxySettings) => Promise<IPCResult>;
}

declare global {
  interface Window {
    veil: VeilAPI;
  }
}

export * from './domain';
