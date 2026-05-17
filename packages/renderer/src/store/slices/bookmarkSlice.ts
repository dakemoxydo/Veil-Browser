import { StateCreator } from 'zustand';
import { BookmarkItem } from '@veil/shared';

export interface BookmarkSlice {
  bookmarks: BookmarkItem[];
}

export const createBookmarkSlice: StateCreator<BookmarkSlice> = () => ({
  bookmarks: [],
});
