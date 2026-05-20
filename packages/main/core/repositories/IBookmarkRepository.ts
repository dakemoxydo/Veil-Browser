import { Bookmark } from '@veil/shared';

export interface IBookmarkRepository {
  getAll(): Bookmark[];
  getById(id: string): Bookmark | undefined;
  getByUrl(url: string): Bookmark | undefined;
  add(bookmark: Bookmark): void;
  remove(id: string): void;
  reorder(sourceId: string, targetId: string): void;
  isBookmarked(url: string): boolean;
  search(query: string, limit?: number): Bookmark[];
}
