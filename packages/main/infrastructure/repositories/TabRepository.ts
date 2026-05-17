import { Tab } from '@veil/shared';
import { ITabRepository } from '../../core/repositories/ITabRepository';

export class TabRepository implements ITabRepository {
  private tabs: Tab[] = [];
  private activeTabId: string | null = null;

  getAll(): Tab[] {
    return [...this.tabs];
  }

  getById(id: string): Tab | undefined {
    return this.tabs.find(t => t.id === id);
  }

  add(tab: Tab): void {
    this.tabs.push(tab);
  }

  remove(id: string): void {
    this.tabs = this.tabs.filter(t => t.id !== id);
  }

  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  setActiveTabId(id: string | null): void {
    this.activeTabId = id;
  }
}
