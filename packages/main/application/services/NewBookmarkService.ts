import { VeilAction, Bookmark } from '@veil/shared';
import { EventTypes } from '../../core/EventBus';
import { IEventBus, IErrorHandler, IStateBroadcaster, ILogger } from '../../core/interfaces';
import { IBookmarkRepository } from '../../core/repositories/IBookmarkRepository';
import { BaseService } from '../../core/BaseService';

export class NewBookmarkService extends BaseService {
  public name = 'BookmarkService';

  constructor(
    private bookmarkRepo: IBookmarkRepository,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    private stateBroadcaster: IStateBroadcaster,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger);
  }

  public async init() {
    this.logger.info('BookmarkService initialized');
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on(EventTypes.BOOKMARK_ADDED, (data: { url: string }) => {
      this.logger.debug(`Bookmark added: ${data.url}`);
    });

    this.eventBus.on(EventTypes.BOOKMARK_REMOVED, (data: { id: string }) => {
      this.logger.debug(`Bookmark removed: ${data.id}`);
    });
  }

  private broadcast() {
    this.stateBroadcaster.patch({
      bookmarks: this.bookmarkRepo.getAll().map(b => b.toJSON()),
    });
  }

  public addBookmark(url: string, title: string, folder?: string, favicon?: string) {
    if (this.bookmarkRepo.isBookmarked(url)) return;

    const bookmark = Bookmark.create(url, title || url, folder, favicon);
    this.bookmarkRepo.add(bookmark);
    this.broadcast();
    this.eventBus.emit(EventTypes.BOOKMARK_ADDED, bookmark.toJSON());
    this.logger.info(`Bookmark added: ${title}`);
  }

  public removeBookmark(id: string) {
    this.bookmarkRepo.remove(id);
    this.broadcast();
    this.eventBus.emit(EventTypes.BOOKMARK_REMOVED, { id });
    this.logger.info(`Bookmark removed: ${id}`);
  }

  public isBookmarked(url: string): boolean {
    return this.bookmarkRepo.isBookmarked(url);
  }

  public async handleAction(action: VeilAction) {
    this.logger.debug(`Handling action: ${action.type}`);

    switch (action.type) {
      case 'BOOKMARK_ADD': {
        const { url, title, folder } = action.payload;
        this.addBookmark(url, title, folder);
        break;
      }
      case 'BOOKMARK_REMOVE': {
        const { id } = action.payload;
        this.removeBookmark(id);
        break;
      }
    }
  }
}
