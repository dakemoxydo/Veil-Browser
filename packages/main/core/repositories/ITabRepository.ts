import { Tab, TabInfo, TabGroup } from '@veil/shared';

export interface ITabRepository {
  getAll(): Tab[];
  getById(id: string): Tab | undefined;
  add(tab: Tab): void;
  remove(id: string): void;
  reorder(fromIndex: number, toIndex: number): void;
  getActiveTabId(): string | null;
  setActiveTabId(id: string | null): void;
  getPinnedIds(): string[];
  setPinnedIds(ids: string[]): void;
  getMutedIds(): string[];
  setMutedIds(ids: string[]): void;
  getTabGroups(): TabGroup[];
  setTabGroups(groups: TabGroup[]): void;
  restoreTabs(): { tabs: TabInfo[]; activeTabId: string | null; pinnedIds: string[]; mutedIds: string[]; tabGroups: TabGroup[] };
  saveTabs(): void;
}
