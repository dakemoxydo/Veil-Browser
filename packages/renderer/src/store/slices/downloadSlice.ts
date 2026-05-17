import { StateCreator } from 'zustand';
import { DownloadItem } from '@veil/shared';

export interface DownloadSlice {
  downloads: DownloadItem[];
}

export const createDownloadSlice: StateCreator<DownloadSlice> = () => ({
  downloads: [],
});
