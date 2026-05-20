import { Tab, TabInfo } from '@veil/shared';
import { ITabRepository } from '../../core/repositories/ITabRepository';
import { IPersistenceService } from '../../core/interfaces';

interface TabsData {
  tabs: TabInfo[];
  activeTabId: string | null;
}

export class TabRepository implements ITabRepository {
  private tabs: Tab[] = [];
  private activeTabId: string | null = null;

  constructor(private persistence: IPersistenceService) {}

  getAll(): Tab[] {
    return [...this.tabs];
  }

  getById(id: string): Tab | undefined {
    return this.tabs.find(t => t.id === id);
  }

  add(tab: Tab): void {
    this.tabs.push(tab);
    this.saveTabs();
  }

  remove(id: string): void {
    this.tabs = this.tabs.filter(t => t.id !== id);
    this.saveTabs();
  }

  reorder(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.tabs.length || toIndex < 0 || toIndex >= this.tabs.length) return;
    const [moved] = this.tabs.splice(fromIndex, 1);
    this.tabs.splice(toIndex, 0, moved);
    this.saveTabs();
  }

  getActiveTabId(): string | null {
    return this.activeTabId;
  }

  setActiveTabId(id: string | null): void {
    this.activeTabId = id;
    this.saveTabs();
  }

  restoreTabs(): { tabs: TabInfo[]; activeTabId: string | null } {
    const data = this.persistence.load<TabsData>('tabs.json', { tabs: [], activeTabId: null });
    return {
      tabs: data.tabs || [],
      activeTabId: data.activeTabId ?? null,
    };
  }

  saveTabs(): void {
    const data: TabsData = {
      tabs: this.tabs.map(t => t.toJSON()),
      activeTabId: this.activeTabId,
    };
    this.persistence.save('tabs.json', data);
  }
}
