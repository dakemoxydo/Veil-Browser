import { HistoryEntryModel, HistoryEntry } from '@veil/shared';
import { IHistoryRepository } from '../../core/repositories/IHistoryRepository';
import { IPersistenceService } from '../../core/interfaces';

export class HistoryRepository implements IHistoryRepository {
  private history: HistoryEntryModel[] = [];
  private static MAX_ENTRIES = 5000;

  constructor(private persistence: IPersistenceService) {
    this.load();
  }

  private load(): void {
    try {
      const data = this.persistence.load<HistoryEntry[]>('history.json', []);
      this.history = data.map(item => HistoryEntryModel.fromJSON(item));
    } catch (e) {
      console.warn('[HistoryRepository] Failed to parse saved history, resetting:', e);
      this.history = [];
    }
  }

  private save(): void {
    this.persistence.save('history.json', this.history.map(h => h.toJSON()));
  }

  getAll(): HistoryEntryModel[] {
    return [...this.history];
  }

  getById(id: string): HistoryEntryModel | undefined {
    return this.history.find(e => e.id === id);
  }

  getByUrl(url: string): HistoryEntryModel | undefined {
    // Return the most recent entry with this URL
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].url === url) return this.history[i];
    }
    return undefined;
  }

  add(entry: HistoryEntryModel): void {
    this.history.push(entry);
    // Prune old entries if over limit
    if (this.history.length > HistoryRepository.MAX_ENTRIES) {
      this.history = this.history.slice(-HistoryRepository.MAX_ENTRIES);
    }
    this.save();
  }

  updateTitle(url: string, title: string): void {
    // Update the most recent entry with this URL (last match)
    let latestEntry: HistoryEntryModel | undefined;
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].url === url) {
        latestEntry = this.history[i];
        break;
      }
    }
    if (latestEntry) {
      latestEntry.updateTitle(title);
      this.save();
    }
  }

  remove(id: string): void {
    this.history = this.history.filter(e => e.id !== id);
    this.save();
  }

  clear(): void {
    this.history = [];
    this.save();
  }

  search(query: string, limit: number = 10): HistoryEntryModel[] {
    const q = query.toLowerCase();
    // Iterate in reverse (newest first) and stop early — avoids sorting
    const results: HistoryEntryModel[] = [];
    for (let i = this.history.length - 1; i >= 0; i--) {
      const e = this.history[i];
      if (e.url.toLowerCase().includes(q) || e.title.toLowerCase().includes(q)) {
        results.push(e);
        if (results.length >= limit) break;
      }
    }
    return results;
  }
}
