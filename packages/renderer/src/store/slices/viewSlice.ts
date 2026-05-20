import { StateCreator } from 'zustand';

export interface ViewSlice {
  currentView: 'browser' | 'settings';
  debugPanelVisible: boolean;
  downloadPanelVisible: boolean;
  setView: (view: 'browser' | 'settings') => void;
  toggleDebugPanel: () => void;
  setDebugPanelVisible: (visible: boolean) => void;
  toggleDownloadPanel: () => void;
  setDownloadPanelVisible: (visible: boolean) => void;
}

export const createViewSlice: StateCreator<ViewSlice> = (set) => ({
  currentView: 'browser',
  debugPanelVisible: false,
  downloadPanelVisible: false,
  setView: (view) => set({ currentView: view }),
  toggleDebugPanel: () => set((state) => ({ debugPanelVisible: !state.debugPanelVisible })),
  setDebugPanelVisible: (visible) => set({ debugPanelVisible: visible }),
  toggleDownloadPanel: () => set((state) => ({ downloadPanelVisible: !state.downloadPanelVisible })),
  setDownloadPanelVisible: (visible) => set({ downloadPanelVisible: visible }),
});
