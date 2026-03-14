// Re-export all public APIs
export type {
  VeilAction,
  SearchScope,
  SettingsPath,
  SettingsValue,
} from './actions'

export type {
  TabMeta,
  WorkspaceMeta,
  ExtensionMeta,
  PrivacyStats,
  AudioData,
  SearchResult,
  VeilSettings,
  VeilState,
  SearchEngine,
  TabsPosition,
  AppTheme,
} from './state'

export {
  DEFAULT_SETTINGS,
} from './state'

export {
  DEFAULT_WORKSPACES,
  IPC_ACTION,
  IPC_STATE,
  IPC_AUDIO,
  IPC_SEARCH,
  IPC_PRIVACY,
  NEW_TAB_URL,
  ADBLOCK_LIST_URL,
} from './constants'
