import { ITabRepository } from '../../core/repositories/ITabRepository';
import { ITabViewProvider } from '../../core/ports/ITabViewProvider';

/**
 * Focuses a specific tab by ID.
 */
export class FocusTabUseCase {
  constructor(
    private readonly tabRepo: ITabRepository,
    private readonly viewProvider: ITabViewProvider,
  ) {}

  execute(tabId: string): boolean {
    const tab = this.tabRepo.getById(tabId);
    if (!tab) return false;

    this.tabRepo.setActiveTabId(tabId);
    this.viewProvider.hideAllViews();
    this.viewProvider.focusView(tabId);
    return true;
  }
}
