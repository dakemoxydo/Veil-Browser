import { HistoryEntryModel } from '@veil/shared';

export interface IHistoryRepository {
  getAll(): HistoryEntryModel[];
  add(entry: HistoryEntryModel): void;
  updateTitle(url: string, title: string): void;
  clear(): void;
}
