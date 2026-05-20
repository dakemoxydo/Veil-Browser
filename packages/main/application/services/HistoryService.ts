import { VeilAction, HistoryEntryModel } from '@veil/shared';
import { EventTypes } from '../../core/EventBus';
import { IEventBus, IErrorHandler, ILogger, IStateBroadcaster } from '../../core/interfaces';
import { IHistoryRepository } from '../../core/repositories/IHistoryRepository';
import { BaseService } from '../../core/BaseService';

export class HistoryService extends BaseService {
  public name = 'HistoryService';

  /** Maps tab ID → last navigated URL for correct title association. */
  private tabUrlMap: Map<string, string> = new Map();
  private listenerCleanups: Array<() => void> = [];

  constructor(
    private historyRepo: IHistoryRepository,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    stateBroadcaster: IStateBroadcaster,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger, stateBroadcaster);
  }

  public async init() {
    this.logger.info('HistoryService initialized');
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.listenerCleanups.push(
      // Record history when tab navigates
      this.eventBus.on(EventTypes.TAB_NAVIGATED, (data: { id: string; url: string; title?: string }) => {
        this.tabUrlMap.set(data.id, data.url);
        this.addEntry(data.url, data.title || data.url);
      }),
      // Update history entry title when page title becomes available
      this.eventBus.on(EventTypes.TAB_TITLE_CHANGED, (data: { id: string; title: string }) => {
        const url = this.tabUrlMap.get(data.id);
        if (url) {
          this.historyRepo.updateTitle(url, data.title);
        }
      }),
      // Clean up tab mapping when tab is closed
      this.eventBus.on(EventTypes.TAB_CLOSED, (data: { id: string }) => {
        this.tabUrlMap.delete(data.id);
      }),
    );
  }

  public destroy(): void {
    this.listenerCleanups.forEach(fn => fn());
    this.listenerCleanups = [];
  }

  public addEntry(url: string, title: string) {
    // Check if URL already exists in history — refresh instead of adding duplicate
    const existing = this.historyRepo.getByUrl(url);
    if (existing) {
      existing.refresh();
      if (title && title !== url) existing.updateTitle(title);
      this.logger.debug(`History entry refreshed: ${url}`);
    } else {
      const entry = HistoryEntryModel.create(url, title || url);
      this.historyRepo.add(entry);
      this.logger.debug(`History entry added: ${url}`);
    }
  }

  /**
   * Register a tab URL mapping for restored tabs.
   */
  public registerTabUrl(tabId: string, url: string): void {
    this.tabUrlMap.set(tabId, url);
  }

  public searchHistory(query: string, limit = 10): { id: string; url: string; title: string; timestamp: number }[] {
    return this.historyRepo.search(query, limit).map(e => ({ id: e.id, url: e.url, title: e.title, timestamp: e.timestamp }));
  }

  public clearHistory(): void {
    this.historyRepo.clear();
    this.logger.info('History cleared');
  }

  public clearSince(timestamp: number): void {
    const all = this.historyRepo.getAll();
    const toRemove = all.filter(e => e.timestamp >= timestamp);
    for (const entry of toRemove) {
      this.historyRepo.remove(entry.id);
    }
    this.logger.info(`Cleared ${toRemove.length} history entries since ${new Date(timestamp).toISOString()}`);
  }

  public async handleAction(action: VeilAction) {
    if (action.type === 'HISTORY_CLEAR') {
      this.clearHistory();
    } else if (action.type === 'HISTORY_CLEAR_SINCE' && action.payload?.timestamp) {
      this.clearSince(action.payload.timestamp);
    }
  }
}
