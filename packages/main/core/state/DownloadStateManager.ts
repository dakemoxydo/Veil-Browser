import { DownloadItem } from '@veil/shared';
import { IStateBroadcaster } from '../interfaces';

export class DownloadStateManager {
  constructor(private stateBroadcaster: IStateBroadcaster) {}

  public updateDownloads(downloads: DownloadItem[]): void {
    this.stateBroadcaster.patch({ downloads });
  }
}
