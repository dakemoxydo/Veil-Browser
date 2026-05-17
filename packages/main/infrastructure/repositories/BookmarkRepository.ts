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
    } catch {
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

  isBookmarked(url: string): boolean {
    return this.bookmarks.some(b => b.matchesUrl(url));
  }
}
