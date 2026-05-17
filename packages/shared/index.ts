export type SearchEngine = 'duckduckgo' | 'google' | 'brave' | 'custom';

export function getSearchUrl(query: string, engine: SearchEngine, customUrl?: string): string {
  const encoded = encodeURIComponent(query);
  switch (engine) {
    case 'google': return `https://www.google.com/search?q=${encoded}`;
    case 'brave': return `https://search.brave.com/search?q=${encoded}`;
    case 'custom': return customUrl ? `${customUrl}${encoded}` : `https://duckduckgo.com/?q=${encoded}`;
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
}

export interface BookmarkItem {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  dateAdded: number;
  folder?: string;
}

export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  timestamp: number;
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
    doNotTrack: boolean;
  };
  appearance: {
    showBookmarksBar: boolean;
    showSidebar: boolean;
  };
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
    doNotTrack: true,
  },
  appearance: {
    showBookmarksBar: true,
    showSidebar: true,
  },
};

export interface VeilState {
  tabs: TabInfo[];
  activeTabId: string | null;
  privacyStats: {
    blockedTotal: number;
    blockedCurrent: number;
  };
  logs: LogEntry[];
  bookmarks: BookmarkItem[];
  downloads: DownloadItem[];
  settings: VeilSettings;
}

export type VeilAction =
  | { type: 'TAB_NEW'; payload: { url?: string } }
  | { type: 'TAB_CLOSE'; payload: { id: string } }
  | { type: 'TAB_NAVIGATE'; payload: { id: string; url: string } }
  | { type: 'TAB_FOCUS'; payload: { id: string } }
  | { type: 'TAB_GO_BACK'; payload: { id: string } }
  | { type: 'TAB_GO_FORWARD'; payload: { id: string } }
  | { type: 'TAB_RELOAD'; payload: { id: string } }
  | { type: 'TAB_GO_HOME'; payload: { id: string } }
  | { type: 'EXT_LOAD_UNPACKED'; payload: { path: string } }
  | { type: 'EXT_DIALOG_OPEN'; payload?: Record<string, never> }
  | { type: 'ADBLOCK_TOGGLE'; payload?: Record<string, never> }
  | { type: 'BOOKMARK_ADD'; payload: { url: string; title: string; folder?: string } }
  | { type: 'BOOKMARK_REMOVE'; payload: { id: string } }
  | { type: 'HISTORY_CLEAR'; payload?: Record<string, never> }
  | { type: 'DOWNLOAD_CANCEL'; payload: { id: string } }
  | { type: 'DOWNLOAD_OPEN'; payload: { id: string } }
  | { type: 'DOWNLOAD_SHOW_IN_FOLDER'; payload: { id: string } }
  | { type: 'SETTINGS_UPDATE'; payload: Partial<VeilSettings> };

export interface IPCResult {
  success: boolean;
  error?: string;
}

export interface VeilAPI {
  dispatch: (action: VeilAction) => Promise<void>;
  getState: () => Promise<VeilState>;
  onStatePatch: (cb: (patch: Partial<VeilState>) => void) => () => void;
  onLog: (cb: (log: LogEntry) => void) => () => void;
  addLog: (level: LogLevel, source: string, message: string, data?: unknown) => Promise<void>;
  minimize: () => Promise<IPCResult>;
  maximize: () => Promise<IPCResult>;
  close: () => Promise<IPCResult>;
  openDebugWindow: () => Promise<IPCResult>;
  closeDebugWindow: () => Promise<IPCResult>;
  setShellOffset: (offset: number) => Promise<IPCResult>;
}

declare global {
  interface Window {
    veil: VeilAPI;
  }
}
