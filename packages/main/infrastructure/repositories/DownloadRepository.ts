import { Download } from '@veil/shared';
import { IDownloadRepository } from '../../core/repositories/IDownloadRepository';

export class DownloadRepository implements IDownloadRepository {
  private downloads: Download[] = [];

  getAll(): Download[] {
    return [...this.downloads];
  }

  getById(id: string): Download | undefined {
    return this.downloads.find(d => d.id === id);
  }

  add(download: Download): void {
    this.downloads.push(download);
  }

  update(download: Download): void {
    const index = this.downloads.findIndex(d => d.id === download.id);
    if (index !== -1) {
      this.downloads[index] = download;
    }
  }
}
