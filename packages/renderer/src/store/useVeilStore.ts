import { create } from 'zustand';
import { VeilState } from '@veil/shared';
import { TabSlice, createTabSlice, selectActiveTab } from './slices/tabSlice';
import { BookmarkSlice, createBookmarkSlice } from './slices/bookmarkSlice';
import { DownloadSlice, createDownloadSlice } from './slices/downloadSlice';
import { SettingsSlice, createSettingsSlice } from './slices/settingsSlice';
import { DebugSlice, createDebugSlice } from './slices/debugSlice';
import { ActionSlice, createActionSlice } from './slices/actionSlice';
import { ViewSlice, createViewSlice } from './slices/viewSlice';

export type VeilStore = TabSlice & BookmarkSlice & DownloadSlice & SettingsSlice & DebugSlice & ActionSlice & ViewSlice & {
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

  applyPatch: (fullState) => {
    set((state) => ({
      ...state,
      ...fullState,
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

  const initialState = await window.veil.getState();
  if (initialState) {
    useVeilStore.getState().applyPatch(initialState);
  }

  const patchCleanup = window.veil.onStatePatch((patch: Partial<VeilState>) => {
    useVeilStore.getState().applyPatch(patch);
  });

  return () => {
    patchCleanup();
  };
};
