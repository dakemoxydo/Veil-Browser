import { VeilSettings } from '@veil/shared';
import { IStateBroadcaster } from '../interfaces';

export class SettingsStateManager {
  constructor(private stateBroadcaster: IStateBroadcaster) {}

  public updateSettings(settings: VeilSettings): void {
    this.stateBroadcaster.patch({ settings });
  }
}
