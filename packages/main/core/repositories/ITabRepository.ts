import { Tab } from '@veil/shared';

export interface ITabRepository {
  getAll(): Tab[];
  getById(id: string): Tab | undefined;
  add(tab: Tab): void;
  remove(id: string): void;
  getActiveTabId(): string | null;
  setActiveTabId(id: string | null): void;
}
