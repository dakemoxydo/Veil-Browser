import { IBookmarkRepository } from '../../core/repositories/IBookmarkRepository';

/**
 * Removes a bookmark by ID.
 */
export class RemoveBookmarkUseCase {
  constructor(private readonly bookmarkRepo: IBookmarkRepository) {}

  execute(bookmarkId: string): boolean {
    const bookmark = this.bookmarkRepo.getById(bookmarkId);
    if (!bookmark) return false;

    this.bookmarkRepo.remove(bookmarkId);
    return true;
  }
}
