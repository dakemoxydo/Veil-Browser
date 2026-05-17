import { VeilService } from '../../core/ServiceRegistry';
import { VeilAction, HistoryEntry } from '@veil/shared';
import { EventBus, EventTypes } from '../../core/EventBus';
import { Logger } from '../../core/Logger';
import { ErrorHandler, ErrorSeverity } from '../../core/ErrorHandler';
import { PersistenceService } from './PersistenceService';
import { randomUUID } from 'crypto';

export class NewHistoryService implements VeilService {
  public name = 'HistoryService';
  private history: HistoryEntry[] = [];
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private eventBus: EventBus;
  private persistence: PersistenceService;

  constructor() {
    this.logger = new Logger('HistoryService');
    this.errorHandler = ErrorHandler.getInstance();
    this.eventBus = EventBus.getInstance();
    this.persistence = new PersistenceService();
  }

  public async init() {
    this.logger.info('HistoryService initialized');
    this.load();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Record history when tab navigates
    this.eventBus.on(EventTypes.TAB_NAVIGATED, (data: { id: string; url: string }) => {
      this.addEntry(data.url, data.url);
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
