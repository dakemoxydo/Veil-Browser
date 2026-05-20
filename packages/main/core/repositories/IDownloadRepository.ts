import { Download } from '@veil/shared';

export interface IDownloadRepository {
  getAll(): Download[];
  getById(id: string): Download | undefined;
  add(download: Download): void;
  update(download: Download): void;
  remove(id: string): void;
}
