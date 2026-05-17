import { create } from 'zustand';
import { VeilState, VeilAction, LogEntry, LogLevel, BookmarkItem, DownloadItem, VeilSettings, DEFAULT_SETTINGS } from '@veil/shared';

interface VeilStore extends VeilState {
  dispatch: (action: VeilAction) => void;
  applyPatch: (patch: Partial<VeilState>) => void;
  addLog: (level: LogLevel, source: string, message: string, data?: unknown) => void;
  clearLogs: () => void;
}

const MAX_LOGS = 500;

export const useVeilStore = create<VeilStore>((set, get) => ({
  tabs: [],
  activeTabId: null,
  privacyStats: {
    blockedTotal: 0,
    blockedCurrent: 0,
  },
  logs: [],
  bookmarks: [],
  downloads: [],
  settings: { ...DEFAULT_SETTINGS },

  dispatch: (action) => {
    get().addLog('ACTION', 'Store', `Action: ${action.type}`, action.payload);
    if (window.veil) {
      window.veil.dispatch(action);
    }
  },

  applyPatch: (patch) => {
    set((state) => ({
      ...state,
      ...patch,
      privacyStats: patch.privacyStats
        ? { ...state.privacyStats, ...patch.privacyStats }
        : state.privacyStats,
    }));
  },

  addLog: (level, source, message, data) => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      source,
      message,
      data,
    };
    set((state) => ({
      logs: [...state.logs.slice(-MAX_LOGS + 1), entry],
    }));
  },

  clearLogs: () => {
    set({ logs: [] });
  },
}));

export const initVeilStore = async () => {
  if (!window.veil) {
    console.warn('[VeilStore] window.veil not available');
    return () => {};
  }

  const initialState = await window.veil.getState();
  useVeilStore.getState().applyPatch(initialState);

  const patchCleanup = window.veil.onStatePatch((patch: Partial<VeilState>) => {
    useVeilStore.getState().applyPatch(patch);
  });

  const localLogsCleanup = window.veil.onLog((log: LogEntry) => {
    useVeilStore.getState().addLog(log.level, log.source, log.message, log.data);
  });

  return () => {
    patchCleanup();
    localLogsCleanup();
  };
};
