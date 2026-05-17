import { VeilAction, HistoryEntry } from '@veil/shared';
import { EventTypes } from '../../core/EventBus';
import { ErrorSeverity } from '../../core/ErrorHandler';
import { IEventBus, IErrorHandler, ILogger, IPersistenceService } from '../../core/interfaces';
import { BaseService } from '../../core/BaseService';
import { randomUUID } from 'crypto';

export class NewHistoryService extends BaseService {
  public name = 'HistoryService';
  private history: HistoryEntry[] = [];

  constructor(
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    logger: ILogger,
    private persistence: IPersistenceService,
  ) {
    super(eventBus, errorHandler, logger);
  }

  public async init() {
    this.logger.info('HistoryService initialized');
    this.load();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Record history when tab navigates
    this.eventBus.on(EventTypes.TAB_NAVIGATED, (data: { id: string; url: string; title?: string }) => {
      this.addEntry(data.url, data.title || data.url);
    });

    // Update history entry title when page title becomes available
    this.eventBus.on(EventTypes.TAB_TITLE_CHANGED, (data: { id: string; title: string }) => {
      const activeTab = this.history.find(h => h.title === h.url);
      if (activeTab) {
        activeTab.title = data.title;
        this.save();
      }
    });
  }

  private load() {
    try {
      this.history = this.persistence.load<HistoryEntry[]>('history.json', []);
    } catch (error) {
      this.errorHandler.handle(
        'HISTORY_LOAD_FAILED',
        String(error),
        ErrorSeverity.MEDIUM,
        'HistoryService'
      );
      this.history = [];
    }
  }

  private save() {
    this.persistence.save('history.json', this.history);
  }

  public addEntry(url: string, title: string) {
    const existing = this.history.find(h => h.url === url);
    if (existing) {
      existing.timestamp = Date.now();
    } else {
      this.history.push({
        id: randomUUID(),
        url,
        title: title || url,
        timestamp: Date.now(),
      });
    }
    this.save();
    this.logger.debug(`History entry added: ${url}`);
  }

  public clear() {
    this.history = [];
    this.save();
    this.logger.info('History cleared');
  }

  public getHistory(): HistoryEntry[] {
    return this.history;
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
