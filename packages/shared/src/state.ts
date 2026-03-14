// ─── State shapes broadcast from Main → Renderer ─────────────────────────────

export interface TabMeta {
  id: string
  url: string
  title: string
  favicon?: string
  isLoading: boolean
  canGoBack: boolean
  canGoForward: boolean
  isAudible: boolean
  isMuted: boolean
  workspaceId: string
}

export interface WorkspaceMeta {
  id: string
  name: string
  icon: string
  accentColor: string
  tabIds: string[]
  activeExtensionIds: string[]
}

export interface ExtensionMeta {
  id: string
  name: string
  version: string
  icon?: string
  enabled: boolean
}

export interface PrivacyStats {
  totalBlocked: number
  trackersBlocked: number
  adsBlocked: number
  perTab: Record<string, number>
}

export interface AudioData {
  tabId: string
  isAudible: boolean
  isMuted: boolean
}

export interface SearchResult {
  id: string
  type: 'tab' | 'history' | 'bookmark' | 'setting' | 'web'
  title: string
  url?: string
  favicon?: string
  action?: string
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'brave'
export type TabsPosition  = 'top' | 'side'
export type AppTheme      = 'dark' | 'system'

export interface VeilSettings {
  general: {
    homePage:       string
    searchEngine:   SearchEngine
    restoreSession: boolean
    showHomeButton: boolean
  }
  privacy: {
    adblockEnabled:  boolean
    blockTrackers:   boolean
    httpsUpgrade:    boolean
    clearCookiesOnExit: boolean
    clearHistoryOnExit: boolean
  }
  appearance: {
    accentColor:  string       // hex, e.g. '#4A9EFF'
    blurStrength: number       // px, 8–40
    tabsPosition: TabsPosition
    theme:        AppTheme
    compactMode:  boolean
  }
  downloads: {
    defaultPath:  string       // absolute path
    askWhereSave: boolean
  }
}

export const DEFAULT_SETTINGS: VeilSettings = {
  general: {
    homePage:       'https://www.google.com',
    searchEngine:   'google',
    restoreSession: true,
    showHomeButton: false,
  },
  privacy: {
    adblockEnabled:      true,
    blockTrackers:       true,
    httpsUpgrade:        true,
    clearCookiesOnExit:  false,
    clearHistoryOnExit:  false,
  },
  appearance: {
    accentColor:  '#4A9EFF',
    blurStrength: 20,
    tabsPosition: 'top',
    theme:        'dark',
    compactMode:  false,
  },
  downloads: {
    defaultPath:  '',
    askWhereSave: true,
  },
}

// ─── State ────────────────────────────────────────────────────────────────────

export interface VeilState {
  tabs:              TabMeta[]
  activeTabId:       string | null
  workspaces:        WorkspaceMeta[]
  activeWorkspaceId: string
  extensions:        ExtensionMeta[]
  privacyStats:      PrivacyStats
  audioData:         AudioData[]
  searchResults:     SearchResult[]
  isSearching:       boolean
  settings:          VeilSettings
}
