import { VeilService } from '../../core/ServiceRegistry';
import { VeilAction, BookmarkItem } from '@veil/shared';
import { EventBus, EventTypes } from '../../core/EventBus';
import { Logger } from '../../core/Logger';
import { ErrorHandler, ErrorSeverity } from '../../core/ErrorHandler';
import { StateBroadcaster } from '../../core/StateBroadcaster';
import { PersistenceService } from './PersistenceService';
import { randomUUID } from 'crypto';

export class NewBookmarkService implements VeilService {
  public name = 'BookmarkService';
  private bookmarks: BookmarkItem[] = [];
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private eventBus: EventBus;
  private stateBroadcaster: StateBroadcaster;
  private persistence: PersistenceService;

  constructor() {
    this.logger = new Logger('BookmarkService');
    this.errorHandler = ErrorHandler.getInstance();
    this.eventBus = EventBus.getInstance();
    this.stateBroadcaster = StateBroadcaster.getInstance();
    this.persistence = new PersistenceService();
  }

  public async init() {
    this.logger.info('BookmarkService initialized');
    this.load();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on(EventTypes.BOOKMARK_ADDED, (data: BookmarkItem) => {
      this.logger.debug(`Bookmark added: ${data.url}`);
    });

    this.eventBus.on(EventTypes.BOOKMARK_REMOVED, (data: { id: string }) => {
      this.logger.debug(`Bookmark removed: ${data.id}`);
    });
  }

  private load() {
    try {
      this.bookmarks = this.persistence.load<BookmarkItem[]>('bookmarks.json', []);
    } catch (error) {
      this.errorHandler.handle(
        'BOOKMARKS_LOAD_FAILED',
        String(error),
        ErrorSeverity.MEDIUM,
        'BookmarkService'
      );
      this.bookmarks = [];
    }
  }

  private save() {
    this.persistence.save('bookmarks.json', this.bookmarks);
  }

  private broadcast() {
    this.stateBroadcaster.patch({ bookmarks: this.bookmarks });
  }

  public addBookmark(url: string, title: string, folder?: string, favicon?: string) {
    if (this.bookmarks.some(b => b.url === url)) return;

    const bookmark: BookmarkItem = {
      id: randomUUID(),
      url,
      title: title || url,
      dateAdded: Date.now(),
      folder,
      favicon,
    };

    this.bookmarks.push(bookmark);
    this.save();
    this.broadcast();
    this.eventBus.emit(EventTypes.BOOKMARK_ADDED, bookmark);
    this.logger.info(`Bookmark added: ${title}`);
  }

  public removeBookmark(id: string) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    this.save();
    this.broadcast();
    this.eventBus.emit(EventTypes.BOOKMARK_REMOVED, { id });
    this.logger.info(`Bookmark removed: ${id}`);
  }

  public isBookmarked(url: string): boolean {
    return this.bookmarks.some(b => b.url === url);
  }

  public getBookmarks(): BookmarkItem[] {
    return this.bookmarks;
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
