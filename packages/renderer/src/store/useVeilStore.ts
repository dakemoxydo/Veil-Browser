import { create } from 'zustand'
import type { VeilState, VeilSettings, WorkspaceMeta } from '@veil/shared'
import { DEFAULT_WORKSPACES } from '@veil/shared'

const defaultSettings: VeilSettings = {
  general:    { homePage: 'https://www.google.com', searchEngine: 'google', restoreSession: true, showHomeButton: false },
  privacy:    { adblockEnabled: true, blockTrackers: true, httpsUpgrade: true, clearCookiesOnExit: false, clearHistoryOnExit: false },
  appearance: { accentColor: '#4A9EFF', blurStrength: 20, tabsPosition: 'top', theme: 'dark', compactMode: false },
  downloads:  { defaultPath: '', askWhereSave: true },
}

// Initial state with default workspaces to avoid race condition on first render
const initialState: VeilState = {
  tabs: [],
  activeTabId: null,
  workspaces: DEFAULT_WORKSPACES.map(ws => ({
    ...ws,
    tabIds: [],
    activeExtensionIds: [],
  })) as WorkspaceMeta[],
  activeWorkspaceId: 'work',
  extensions: [],
  privacyStats: { totalBlocked: 0, trackersBlocked: 0, adsBlocked: 0, perTab: {} },
  audioData: [],
  searchResults: [],
  isSearching: false,
  settings: defaultSettings,
}

interface VeilStore extends VeilState {
  applyPatch: (patch: Partial<VeilState>) => void
}

export const useVeilStore = create<VeilStore>((set) => ({
  ...initialState,
  applyPatch: (patch) => set((state) => ({ ...state, ...patch })),
}))


