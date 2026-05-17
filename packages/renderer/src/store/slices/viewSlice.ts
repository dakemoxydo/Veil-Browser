import { StateCreator } from 'zustand';

export interface ViewSlice {
  currentView: 'browser' | 'settings';
  setView: (view: 'browser' | 'settings') => void;
}

export const createViewSlice: StateCreator<ViewSlice> = (set) => ({
  currentView: 'browser',
  setView: (view) => set({ currentView: view }),
});
