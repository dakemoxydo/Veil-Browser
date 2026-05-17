import { HistoryEntryModel, HistoryEntry } from '@veil/shared';
import { IHistoryRepository } from '../../core/repositories/IHistoryRepository';
import { IPersistenceService } from '../../core/interfaces';

export class HistoryRepository implements IHistoryRepository {
  private history: HistoryEntryModel[] = [];

  constructor(private persistence: IPersistenceService) {
    this.load();
  }

  private load(): void {
    try {
      const data = this.persistence.load<HistoryEntry[]>('history.json', []);
      this.history = data.map(item => HistoryEntryModel.fromJSON(item));
    } catch {
      this.history = [];
    }
  }

  private save(): void {
    this.persistence.save('history.json', this.history.map(h => h.toJSON()));
  }

  getAll(): HistoryEntryModel[] {
    return [...this.history];
  }

  add(entry: HistoryEntryModel): void {
    this.history.push(entry);
    this.save();
  }

  updateTitle(url: string, title: string): void {
    const entry = this.history.find(h => h.url === url);
    if (entry) {
      entry.updateTitle(title);
      this.save();
    }
  }

  clear(): void {
    this.history = [];
    this.save();
  }
}
