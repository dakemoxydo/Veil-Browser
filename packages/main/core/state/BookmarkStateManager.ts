import { BookmarkItem } from '@veil/shared';
import { IStateBroadcaster } from '../interfaces';

export class BookmarkStateManager {
  constructor(private stateBroadcaster: IStateBroadcaster) {}

  public updateBookmarks(bookmarks: BookmarkItem[]): void {
    this.stateBroadcaster.patch({ bookmarks });
  }
}
