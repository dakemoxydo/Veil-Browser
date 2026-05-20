import { Tab, TabInfo } from '@veil/shared';

export interface ITabRepository {
  getAll(): Tab[];
  getById(id: string): Tab | undefined;
  add(tab: Tab): void;
  remove(id: string): void;
  reorder(fromIndex: number, toIndex: number): void;
  getActiveTabId(): string | null;
  setActiveTabId(id: string | null): void;
  restoreTabs(): { tabs: TabInfo[]; activeTabId: string | null };
  saveTabs(): void;
}
