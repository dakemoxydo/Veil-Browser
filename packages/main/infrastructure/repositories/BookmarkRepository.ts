import { Bookmark, BookmarkItem } from '@veil/shared';
import { IBookmarkRepository } from '../../core/repositories/IBookmarkRepository';
import { IPersistenceService } from '../../core/interfaces';

export class BookmarkRepository implements IBookmarkRepository {
  private bookmarks: Bookmark[] = [];

  constructor(private persistence: IPersistenceService) {
    this.load();
  }

  private load(): void {
    try {
      const data = this.persistence.load<BookmarkItem[]>('bookmarks.json', []);
      this.bookmarks = data.map(item => Bookmark.fromJSON(item));
    } catch (e) {
      console.warn('[BookmarkRepository] Failed to parse saved bookmarks, resetting:', e);
      this.bookmarks = [];
    }
  }

  private save(): void {
    this.persistence.save('bookmarks.json', this.bookmarks.map(b => b.toJSON()));
  }

  getAll(): Bookmark[] {
    return [...this.bookmarks];
  }

  getById(id: string): Bookmark | undefined {
    return this.bookmarks.find(b => b.id === id);
  }

  getByUrl(url: string): Bookmark | undefined {
    return this.bookmarks.find(b => b.matchesUrl(url));
  }

  add(bookmark: Bookmark): void {
    this.bookmarks.push(bookmark);
    this.save();
  }

  remove(id: string): void {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    this.save();
  }

  reorder(sourceId: string, targetId: string): void {
    const sourceIndex = this.bookmarks.findIndex(b => b.id === sourceId);
    const targetIndex = this.bookmarks.findIndex(b => b.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;
    const [moved] = this.bookmarks.splice(sourceIndex, 1);
    this.bookmarks.splice(targetIndex, 0, moved);
    this.save();
  }

  isBookmarked(url: string): boolean {
    return this.bookmarks.some(b => b.matchesUrl(url));
  }

  search(query: string, limit: number = 10): Bookmark[] {
    const q = query.toLowerCase();
    // Iterate in reverse (newest first) and stop early — avoids sorting
    const results: Bookmark[] = [];
    for (let i = this.bookmarks.length - 1; i >= 0; i--) {
      const b = this.bookmarks[i];
      if (b.url.toLowerCase().includes(q) || b.title.toLowerCase().includes(q)) {
        results.push(b);
        if (results.length >= limit) break;
      }
    }
    return results;
  }
}
