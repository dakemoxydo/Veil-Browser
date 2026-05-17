import { StateCreator } from 'zustand';
import { TabInfo } from '@veil/shared';

export interface TabSlice {
  tabs: TabInfo[];
  activeTabId: string | null;
}

export const createTabSlice: StateCreator<TabSlice> = () => ({
  tabs: [],
  activeTabId: null,
});

export const selectActiveTab = (state: TabSlice) =>
  state.tabs.find(t => t.id === state.activeTabId) ?? null;
