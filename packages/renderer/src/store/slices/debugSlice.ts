import { StateCreator } from 'zustand';
import { LogEntry, LogLevel } from '@veil/shared';

const MAX_LOGS = 500;

export interface DebugSlice {
  logs: LogEntry[];
  addLog: (level: LogLevel, source: string, message: string, data?: unknown) => void;
  clearLogs: () => void;
}

export const createDebugSlice: StateCreator<DebugSlice> = (set) => ({
  logs: [],

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
});
