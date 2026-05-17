import { app } from 'electron';
import { VeilAction, VeilSettings } from '@veil/shared';
import { EventTypes } from '../../core/EventBus';
import { IEventBus, IErrorHandler, IStateBroadcaster, ILogger } from '../../core/interfaces';
import { ISettingsRepository } from '../../core/repositories/ISettingsRepository';
import { BaseService } from '../../core/BaseService';

export class NewSettingsService extends BaseService {
  public name = 'SettingsService';

  constructor(
    private settingsRepo: ISettingsRepository,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    private stateBroadcaster: IStateBroadcaster,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger);
  }

  public async init() {
    this.logger.info('SettingsService initialized');
    // Set default download path if not configured
    const settings = this.settingsRepo.get();
    if (!settings.general.downloadPath) {
      this.settingsRepo.update({ general: { ...settings.general, downloadPath: app.getPath('downloads') } });
    }
    this.broadcast();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on(EventTypes.SETTINGS_CHANGED, (data: Partial<VeilSettings>) => {
      this.logger.debug('Settings changed', data);
    });
  }

  private broadcast() {
    this.stateBroadcaster.patch({ settings: this.settingsRepo.get() });
  }

  public getSettings(): VeilSettings {
    return this.settingsRepo.get();
  }

  public async handleAction(action: VeilAction) {
    this.logger.debug(`Handling action: ${action.type}`);

    if (action.type === 'SETTINGS_UPDATE' && action.payload) {
      const payload = action.payload as Partial<VeilSettings>;
      this.settingsRepo.update(payload);
      this.broadcast();
      this.eventBus.emit(EventTypes.SETTINGS_CHANGED, payload);
      this.logger.info('Settings updated');
    }
  }
}
