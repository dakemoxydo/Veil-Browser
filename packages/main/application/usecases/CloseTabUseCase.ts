import { ITabRepository } from '../../core/repositories/ITabRepository';
import { ITabViewProvider } from '../../core/ports/ITabViewProvider';

/**
 * Closes a tab and manages focus transfer to an adjacent tab.
 */
export class CloseTabUseCase {
  constructor(
    private readonly tabRepo: ITabRepository,
    private readonly viewProvider: ITabViewProvider,
  ) {}

  execute(tabId: string): string | null {
    const tab = this.tabRepo.getById(tabId);
    if (!tab) return null;

    const allTabs = this.tabRepo.getAll();
    const index = allTabs.findIndex(t => t.id === tabId);

    this.tabRepo.remove(tabId);
    this.viewProvider.closeView(tabId);

    let newActiveId: string | null = null;

    if (this.tabRepo.getActiveTabId() === tabId) {
      const remaining = this.tabRepo.getAll();
      newActiveId = remaining.length > 0 ? remaining[Math.max(0, index - 1)].id : null;
      this.tabRepo.setActiveTabId(newActiveId);
      if (newActiveId) {
        this.viewProvider.focusView(newActiveId);
      }
    }

    return newActiveId;
  }
}
