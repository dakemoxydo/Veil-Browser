import { ITabRepository } from '../../core/repositories/ITabRepository';
import { ITabViewProvider } from '../../core/ports/ITabViewProvider';

/**
 * Navigates a tab to a URL.
 */
export class NavigateTabUseCase {
  constructor(
    private readonly tabRepo: ITabRepository,
    private readonly viewProvider: ITabViewProvider,
  ) {}

  execute(tabId: string, url: string): boolean {
    const tab = this.tabRepo.getById(tabId);
    if (!tab) return false;

    tab.navigate(url);
    this.viewProvider.navigateView(tabId, url);

    return true;
  }
}
