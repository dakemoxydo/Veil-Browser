// ─── IPC Channel names ───────────────────────────────────────────────────────
export const IPC_ACTION   = 'veil:action'
export const IPC_STATE    = 'veil:state-patch'
export const IPC_AUDIO    = 'veil:audio'
export const IPC_SEARCH   = 'veil:search-results'
export const IPC_PRIVACY  = 'veil:privacy-stats'

// ─── Default workspace definitions ───────────────────────────────────────────
export const DEFAULT_WORKSPACES = [
  { id: 'work',   name: 'Work',   icon: '💼', accentColor: '#4A9EFF' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', accentColor: '#FF5F87' },
  { id: 'study',  name: 'Study',  icon: '📚', accentColor: '#34D399' },
] as const

// ─── New Tab Page URL ─────────────────────────────────────────────────────────
export const NEW_TAB_URL = 'veil://newtab'

// ─── Adblock filter list URL ──────────────────────────────────────────────────
export const ADBLOCK_LIST_URL = 'https://easylist.to/easylist/easylist.txt'
