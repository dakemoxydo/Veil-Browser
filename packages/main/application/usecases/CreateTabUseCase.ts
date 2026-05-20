import { Tab } from '@veil/shared';
import { ITabRepository } from '../../core/repositories/ITabRepository';
import { ITabViewProvider } from '../../core/ports/ITabViewProvider';

/**
 * Creates a new tab and its associated view.
 */
export class CreateTabUseCase {
  constructor(
    private readonly tabRepo: ITabRepository,
    private readonly viewProvider: ITabViewProvider,
  ) {}

  execute(url: string): Tab {
    const tab = Tab.create(url);
    this.tabRepo.add(tab);
    this.viewProvider.hideAllViews();
    this.tabRepo.setActiveTabId(tab.id);
    this.viewProvider.createView(tab.id, tab.url);
    return tab;
  }
}
