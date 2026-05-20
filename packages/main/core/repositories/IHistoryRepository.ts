import { HistoryEntryModel } from '@veil/shared';

export interface IHistoryRepository {
  getAll(): HistoryEntryModel[];
  getById(id: string): HistoryEntryModel | undefined;
  getByUrl(url: string): HistoryEntryModel | undefined;
  add(entry: HistoryEntryModel): void;
  updateTitle(url: string, title: string): void;
  remove(id: string): void;
  clear(): void;
  search(query: string, limit?: number): HistoryEntryModel[];
}
