import { create } from 'zustand';
import { VeilState } from '@veil/shared';
import { TabSlice, createTabSlice, selectActiveTab } from './slices/tabSlice';
import { BookmarkSlice, createBookmarkSlice } from './slices/bookmarkSlice';
import { DownloadSlice, createDownloadSlice } from './slices/downloadSlice';
import { SettingsSlice, createSettingsSlice } from './slices/settingsSlice';
import { DebugSlice, createDebugSlice } from './slices/debugSlice';
import { ActionSlice, createActionSlice } from './slices/actionSlice';
import { ViewSlice, createViewSlice } from './slices/viewSlice';
import { ToastSlice, createToastSlice } from './slices/toastSlice';

export type VeilStore = TabSlice & BookmarkSlice & DownloadSlice & SettingsSlice & DebugSlice & ActionSlice & ViewSlice & ToastSlice & {
  recentlyClosed: VeilState['recentlyClosed'];
  tabGroups: VeilState['tabGroups'];
  privacyStats: VeilState['privacyStats'];
  certExceptions: VeilState['certExceptions'];
  scriptBlockList: VeilState['scriptBlockList'];
  zoomLevel: number;
  applyPatch: (patch: Partial<VeilState>) => void;
};

export const useVeilStore = create<VeilStore>()((set, get, store) => ({
  ...createTabSlice(set, get, store),
  ...createBookmarkSlice(set, get, store),
  ...createDownloadSlice(set, get, store),
  ...createSettingsSlice(set, get, store),
  ...createDebugSlice(set, get, store),
  ...createActionSlice(set, get, store),
  ...createViewSlice(set, get, store),
  ...createToastSlice(set, get, store),

  recentlyClosed: [],
  tabGroups: [],
  privacyStats: { blockedTotal: 0, blockedCurrent: 0, blockedAds: 0, blockedTrackers: 0, httpsUpgrades: 0, cookiesBlocked: 0 },
  certExceptions: [],
  scriptBlockList: [],
  zoomLevel: 0,

  applyPatch: (patch) => {
    set((state) => ({
      ...state,
      ...patch,
      // Deep merge settings
      settings: patch.settings
        ? {
            ...state.settings,
            ...patch.settings,
            general: { ...state.settings.general, ...patch.settings.general },
            privacy: { ...state.settings.privacy, ...patch.settings.privacy },
            appearance: { ...state.settings.appearance, ...patch.settings.appearance },
            proxy: { ...state.settings.proxy, ...patch.settings.proxy },
          }
        : state.settings,
      // Deep merge privacyStats
      privacyStats: patch.privacyStats
        ? { ...state.privacyStats, ...patch.privacyStats }
        : state.privacyStats,
      // Preserve local-only fields
      currentView: state.currentView,
      logs: state.logs,
    }));
  },
}));

// Re-export selectors
export { selectActiveTab };

export const initVeilStore = async () => {
  if (!window.veil) {
    console.warn('[VeilStore] window.veil not available');
    return () => {};
  }

  try {
    const initialState = await window.veil.getState();
    if (initialState) {
      useVeilStore.getState().applyPatch(initialState);
    }
  } catch (err) {
    console.error('[VeilStore] Failed to fetch initial state:', err);
  }

  const patchCleanup = window.veil.onStatePatch((patch: Partial<VeilState>) => {
    useVeilStore.getState().applyPatch(patch);
  });

  return () => {
    patchCleanup();
  };
};
