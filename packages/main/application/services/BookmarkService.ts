import { VeilAction } from '@veil/shared';
import { EventTypes } from '../../core/EventBus';
import { IEventBus, IErrorHandler, IStateBroadcaster, ILogger } from '../../core/interfaces';
import { IBookmarkRepository } from '../../core/repositories/IBookmarkRepository';
import { BaseService } from '../../core/BaseService';
import { AddBookmarkUseCase } from '../usecases/AddBookmarkUseCase';
import { RemoveBookmarkUseCase } from '../usecases/RemoveBookmarkUseCase';

export class BookmarkService extends BaseService {
  public name = 'BookmarkService';

  private addBookmarkUC: AddBookmarkUseCase;
  private removeBookmarkUC: RemoveBookmarkUseCase;
  private listenerCleanups: Array<() => void> = [];

  constructor(
    private bookmarkRepo: IBookmarkRepository,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    stateBroadcaster: IStateBroadcaster,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger, stateBroadcaster);
    this.addBookmarkUC = new AddBookmarkUseCase(bookmarkRepo);
    this.removeBookmarkUC = new RemoveBookmarkUseCase(bookmarkRepo);
  }

  public async init() {
    this.logger.info('BookmarkService initialized');
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.listenerCleanups.push(
      this.eventBus.on(EventTypes.BOOKMARK_ADDED, (data: { url: string }) => {
        this.logger.debug(`Bookmark added: ${data.url}`);
      }),
      this.eventBus.on(EventTypes.BOOKMARK_REMOVED, (data: { id: string }) => {
        this.logger.debug(`Bookmark removed: ${data.id}`);
      }),
    );
  }

  public destroy(): void {
    this.listenerCleanups.forEach(fn => fn());
    this.listenerCleanups = [];
  }

  private broadcastBookmarks() {
    this.broadcast({
      bookmarks: this.bookmarkRepo.getAll().map(b => b.toJSON()),
    });
  }

  public addBookmark(url: string, title: string, folder?: string) {
    const bookmark = this.addBookmarkUC.execute(url, title || url, folder);
    this.broadcastBookmarks();
    this.eventBus.emit(EventTypes.BOOKMARK_ADDED, bookmark.toJSON());
    this.logger.info(`Bookmark added: ${title}`);
  }

  public removeBookmark(id: string) {
    if (this.removeBookmarkUC.execute(id)) {
      this.broadcastBookmarks();
      this.eventBus.emit(EventTypes.BOOKMARK_REMOVED, { id });
      this.logger.info(`Bookmark removed: ${id}`);
    }
  }

  public isBookmarked(url: string): boolean {
    return this.bookmarkRepo.isBookmarked(url);
  }

  public searchBookmarks(query: string): { url: string; title: string }[] {
    return this.bookmarkRepo.search(query, 10).map(b => ({ url: b.url, title: b.title }));
  }

  public async handleAction(action: VeilAction) {
    this.logger.debug(`Handling action: ${action.type}`);

    switch (action.type) {
      case 'BOOKMARK_ADD': {
        const url = action.payload?.url;
        const title = action.payload?.title;
        const folder = action.payload?.folder;
        if (!url || !title) return;
        this.addBookmark(url, title, folder);
        break;
      }
      case 'BOOKMARK_REMOVE': {
        const id = action.payload?.id;
        if (!id) return;
        this.removeBookmark(id);
        break;
      }
      case 'BOOKMARK_REORDER': {
        const sourceId = action.payload?.sourceId;
        const targetId = action.payload?.targetId;
        if (!sourceId || !targetId) return;
        this.reorderBookmarks(sourceId, targetId);
        break;
      }
    }
  }

  public reorderBookmarks(sourceId: string, targetId: string) {
    this.bookmarkRepo.reorder(sourceId, targetId);
    this.broadcastBookmarks();
    this.logger.debug(`Bookmark reordered: ${sourceId} -> ${targetId}`);
  }
}
