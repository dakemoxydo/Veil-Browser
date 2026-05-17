import { TabInfo } from '@veil/shared';
import { IStateBroadcaster } from '../interfaces';

export class TabStateManager {
  constructor(private stateBroadcaster: IStateBroadcaster) {}

  public updateTabs(tabs: TabInfo[], activeTabId: string | null): void {
    this.stateBroadcaster.patch({ tabs, activeTabId });
  }
}
