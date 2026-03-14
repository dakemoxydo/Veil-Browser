// ─── All actions the Renderer can dispatch to Main ───────────────────────────
import type { SearchEngine, TabsPosition, AppTheme } from './state'

// Helper type to extract value type from SettingsPath
// Uses VeilSettings indirectly via the SettingsPath union
export type SettingsValue<T extends SettingsPath> =
  T extends 'general.homePage' ? string :
  T extends 'general.searchEngine' ? SearchEngine :
  T extends 'general.restoreSession' ? boolean :
  T extends 'general.showHomeButton' ? boolean :
  T extends 'privacy.adblockEnabled' ? boolean :
  T extends 'privacy.blockTrackers' ? boolean :
  T extends 'privacy.httpsUpgrade' ? boolean :
  T extends 'privacy.clearCookiesOnExit' ? boolean :
  T extends 'privacy.clearHistoryOnExit' ? boolean :
  T extends 'appearance.accentColor' ? string :
  T extends 'appearance.blurStrength' ? number :
  T extends 'appearance.tabsPosition' ? TabsPosition :
  T extends 'appearance.theme' ? AppTheme :
  T extends 'appearance.compactMode' ? boolean :
  T extends 'downloads.defaultPath' ? string :
  T extends 'downloads.askWhereSave' ? boolean :
  unknown

export type VeilAction =
  // Tab lifecycle
  | { type: 'TAB_NEW';        payload: { url?: string; workspaceId?: string } }
  | { type: 'TAB_CLOSE';      payload: { tabId: string } }
  | { type: 'TAB_FOCUS';      payload: { tabId: string } }
  | { type: 'TAB_NAVIGATE';   payload: { tabId: string; url: string } }
  | { type: 'TAB_GO_BACK';    payload: { tabId: string } }
  | { type: 'TAB_GO_FORWARD'; payload: { tabId: string } }
  | { type: 'TAB_RELOAD';     payload: { tabId: string } }
  | { type: 'TAB_MOVE_WORKSPACE'; payload: { tabId: string; workspaceId: string } }
  // Workspace
  | { type: 'WORKSPACE_SWITCH'; payload: { id: string } }
  | { type: 'WORKSPACE_CREATE'; payload: { name: string; icon?: string; accentColor?: string } }
  | { type: 'WORKSPACE_DELETE'; payload: { id: string } }
  // Audio
  | { type: 'AUDIO_MUTE';   payload: { tabId: string; muted: boolean } }
  | { type: 'AUDIO_VOLUME'; payload: { tabId: string; volume: number } }
  // Adblock
  | { type: 'ADBLOCK_TOGGLE'; payload: { tabId: string; enabled: boolean } }
  | { type: 'ADBLOCK_WHITELIST'; payload: { hostname: string } }
  // Extensions
  | { type: 'EXT_INSTALL'; payload: { path: string } }
  | { type: 'EXT_REMOVE';  payload: { extensionId: string } }
  | { type: 'EXT_TOGGLE';  payload: { extensionId: string; workspaceId?: string } }
  // Command Palette
  | { type: 'SEARCH_QUERY'; payload: { q: string; scope: SearchScope[] } }
  // AI Bridge
  | { type: 'AI_QUERY';    payload: { prompt: string; tabId?: string } }
  // Settings
  | { type: 'SETTINGS_UPDATE'; payload: { path: SettingsPath; value: SettingsValue<SettingsPath> } }
  | { type: 'SETTINGS_RESET' }
  | { type: 'SETTINGS_OPEN_DOWNLOADS_DIR' }
  // Window
  | { type: 'WINDOW_MINIMIZE' }
  | { type: 'WINDOW_MAXIMIZE' }
  | { type: 'WINDOW_CLOSE' }

export type SearchScope = 'tabs' | 'history' | 'bookmarks' | 'settings' | 'web'

/** Dot-path into VeilSettings */
export type SettingsPath =
  // General settings
  | 'general.homePage'
  | 'general.searchEngine'
  | 'general.restoreSession'
  | 'general.showHomeButton'
  // Privacy settings
  | 'privacy.adblockEnabled'
  | 'privacy.blockTrackers'
  | 'privacy.httpsUpgrade'
  | 'privacy.clearCookiesOnExit'
  | 'privacy.clearHistoryOnExit'
  // Appearance settings
  | 'appearance.accentColor'
  | 'appearance.blurStrength'
  | 'appearance.tabsPosition'
  | 'appearance.theme'
  | 'appearance.compactMode'
  // Downloads settings
  | 'downloads.defaultPath'
  | 'downloads.askWhereSave'
