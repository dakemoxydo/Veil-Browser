import { StateCreator } from 'zustand';
import { TabInfo, TabGroup } from '@veil/shared';

export interface TabSlice {
  tabs: TabInfo[];
  activeTabId: string | null;
  tabGroups: TabGroup[];
}

export const createTabSlice: StateCreator<TabSlice> = () => ({
  tabs: [],
  activeTabId: null,
  tabGroups: [],
});

// Memoized selector: returns stable reference when active tab data hasn't changed.
// Prevents re-renders from IPC patches that don't affect the active tab.
let _prevTab: TabInfo | null = null;
export const selectActiveTab = (state: TabSlice): TabInfo | null => {
  const tab = state.tabs.find(t => t.id === state.activeTabId) ?? null;
  if (tab === _prevTab) return _prevTab;
  if (tab && _prevTab &&
    tab.id === _prevTab.id && tab.url === _prevTab.url &&
    tab.title === _prevTab.title && tab.isLoading === _prevTab.isLoading &&
    tab.loadProgress === _prevTab.loadProgress && tab.canGoBack === _prevTab.canGoBack &&
    tab.canGoForward === _prevTab.canGoForward && tab.favicon === _prevTab.favicon) {
    return _prevTab;
  }
  _prevTab = tab;
  return tab;
};
