import { IStateBroadcaster } from '../interfaces';

export class PrivacyStateManager {
  constructor(private stateBroadcaster: IStateBroadcaster) {}

  public updatePrivacyStats(blockedTotal: number, blockedCurrent: number): void {
    this.stateBroadcaster.patch({
      privacyStats: { blockedTotal, blockedCurrent }
    });
  }
}
