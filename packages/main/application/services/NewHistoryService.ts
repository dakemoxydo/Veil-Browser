import { VeilAction, HistoryEntryModel } from '@veil/shared';
import { EventTypes } from '../../core/EventBus';
import { IEventBus, IErrorHandler, ILogger } from '../../core/interfaces';
import { IHistoryRepository } from '../../core/repositories/IHistoryRepository';
import { BaseService } from '../../core/BaseService';

export class NewHistoryService extends BaseService {
  public name = 'HistoryService';

  constructor(
    private historyRepo: IHistoryRepository,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger);
  }

  public async init() {
    this.logger.info('HistoryService initialized');
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Record history when tab navigates
    this.eventBus.on(EventTypes.TAB_NAVIGATED, (data: { id: string; url: string; title?: string }) => {
      this.addEntry(data.url, data.title || data.url);
    });

    // Update history entry title when page title becomes available
    // We need to find the history entry by matching the most recent entry
    // Since TAB_TITLE_CHANGED only has id and title, we update the last entry
    this.eventBus.on(EventTypes.TAB_TITLE_CHANGED, (data: { id: string; title: string }) => {
      // The history entry that needs updating is the most recent one
      const allEntries = this.historyRepo.getAll();
      if (allEntries.length > 0) {
        const lastEntry = allEntries[allEntries.length - 1];
        if (lastEntry.title === lastEntry.url) {
          this.historyRepo.updateTitle(lastEntry.url, data.title);
        }
      }
    });
  }

  public addEntry(url: string, title: string) {
    const entry = HistoryEntryModel.create(url, title || url);
    this.historyRepo.add(entry);
    this.logger.debug(`History entry added: ${url}`);
  }

  public clear() {
    this.historyRepo.clear();
    this.logger.info('History cleared');
  }

  public async handleAction(action: VeilAction) {
    this.logger.debug(`Handling action: ${action.type}`);

    switch (action.type) {
      case 'HISTORY_CLEAR': {
        this.clear();
        break;
      }
    }
  }
}
