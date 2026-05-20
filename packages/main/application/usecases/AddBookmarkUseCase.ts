import { Bookmark } from '@veil/shared';
import { IBookmarkRepository } from '../../core/repositories/IBookmarkRepository';

/**
 * Adds a bookmark for a URL.
 */
export class AddBookmarkUseCase {
  constructor(private readonly bookmarkRepo: IBookmarkRepository) {}

  execute(url: string, title: string, folder?: string): Bookmark {
    const existing = this.bookmarkRepo.getByUrl(url);
    if (existing) return existing;

    const bookmark = Bookmark.create(url, title, folder);
    this.bookmarkRepo.add(bookmark);
    return bookmark;
  }
}
