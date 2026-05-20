import { Download } from '@veil/shared';
import { IDownloadRepository } from '../../core/repositories/IDownloadRepository';

export class DownloadRepository implements IDownloadRepository {
  private downloads: Download[] = [];
  private static MAX_DOWNLOADS = 100;

  getAll(): Download[] {
    return [...this.downloads];
  }

  getById(id: string): Download | undefined {
    return this.downloads.find(d => d.id === id);
  }

  add(download: Download): void {
    this.downloads.push(download);
    // Prune completed downloads if over limit
    if (this.downloads.length > DownloadRepository.MAX_DOWNLOADS) {
      const active = this.downloads.filter(d => d.state === 'progressing');
      const completed = this.downloads.filter(d => d.state !== 'progressing');
      // Keep all active + most recent completed up to MAX_DOWNLOADS
      const maxCompleted = Math.max(0, DownloadRepository.MAX_DOWNLOADS - active.length);
      this.downloads = [...active, ...completed.slice(-maxCompleted)];
    }
  }

  update(download: Download): void {
    const index = this.downloads.findIndex(d => d.id === download.id);
    if (index !== -1) {
      this.downloads[index] = download;
    }
  }

  remove(id: string): void {
    this.downloads = this.downloads.filter(d => d.id !== id);
  }
}
