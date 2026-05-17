import { app } from 'electron';
import { VeilAction, VeilSettings, DEFAULT_SETTINGS } from '@veil/shared';
import { EventTypes } from '../../core/EventBus';
import { ErrorSeverity } from '../../core/ErrorHandler';
import { IEventBus, IErrorHandler, IStateBroadcaster, ILogger, IPersistenceService } from '../../core/interfaces';
import { BaseService } from '../../core/BaseService';

export class NewSettingsService extends BaseService {
  public name = 'SettingsService';
  private settings: VeilSettings = { ...DEFAULT_SETTINGS };

  constructor(
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    private stateBroadcaster: IStateBroadcaster,
    logger: ILogger,
    private persistence: IPersistenceService,
  ) {
    super(eventBus, errorHandler, logger);
  }

  public async init() {
    this.logger.info('SettingsService initialized');
    this.load();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on(EventTypes.SETTINGS_CHANGED, (data: Partial<VeilSettings>) => {
      this.logger.debug('Settings changed', data);
    });
  }

  public load() {
    try {
      const saved = this.persistence.load<Partial<VeilSettings>>('settings.json', {});
      if (saved && typeof saved === 'object') {
        this.settings = {
          general: (saved.general && typeof saved.general === 'object' && !Array.isArray(saved.general))
            ? { ...DEFAULT_SETTINGS.general, ...saved.general }
            : { ...DEFAULT_SETTINGS.general },
          privacy: (saved.privacy && typeof saved.privacy === 'object' && !Array.isArray(saved.privacy))
            ? { ...DEFAULT_SETTINGS.privacy, ...saved.privacy }
            : { ...DEFAULT_SETTINGS.privacy },
          appearance: (saved.appearance && typeof saved.appearance === 'object' && !Array.isArray(saved.appearance))
            ? { ...DEFAULT_SETTINGS.appearance, ...saved.appearance }
            : { ...DEFAULT_SETTINGS.appearance },
        };
      }
    } catch (error) {
      this.errorHandler.handle(
        'SETTINGS_LOAD_FAILED',
        String(error),
        ErrorSeverity.MEDIUM,
        'SettingsService'
      );
      this.settings = { ...DEFAULT_SETTINGS };
    }

    if (!this.settings.general.downloadPath) {
      this.settings.general.downloadPath = app.getPath('downloads');
    }
  }

  private save() {
    this.persistence.save('settings.json', this.settings);
  }

  private broadcast() {
    this.stateBroadcaster.patch({ settings: this.settings });
  }

  public getSettings(): VeilSettings {
    return this.settings;
  }

  public async handleAction(action: VeilAction) {
    this.logger.debug(`Handling action: ${action.type}`);

    if (action.type === 'SETTINGS_UPDATE' && action.payload) {
      const payload = action.payload as Partial<VeilSettings>;

      if (payload.general && typeof payload.general === 'object') {
        this.settings.general = { ...this.settings.general, ...payload.general };
      }
      if (payload.privacy && typeof payload.privacy === 'object') {
        this.settings.privacy = { ...this.settings.privacy, ...payload.privacy };
      }
      if (payload.appearance && typeof payload.appearance === 'object') {
        this.settings.appearance = { ...this.settings.appearance, ...payload.appearance };
      }

      this.save();
      this.broadcast();
      this.eventBus.emit(EventTypes.SETTINGS_CHANGED, payload);
      this.logger.info('Settings updated');
    }
  }
}
