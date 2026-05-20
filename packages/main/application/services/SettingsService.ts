import { app } from 'electron';
import { VeilAction, VeilSettings } from '@veil/shared';
import { EventTypes } from '../../core/EventBus';
import { IEventBus, IErrorHandler, IStateBroadcaster, ILogger } from '../../core/interfaces';
import { ISettingsRepository } from '../../core/repositories/ISettingsRepository';
import { BaseService } from '../../core/BaseService';
import { UpdateSettingsUseCase } from '../usecases/UpdateSettingsUseCase';

export class SettingsService extends BaseService {
  public name = 'SettingsService';

  private updateSettings: UpdateSettingsUseCase;
  private listenerCleanups: Array<() => void> = [];

  constructor(
    private settingsRepo: ISettingsRepository,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    stateBroadcaster: IStateBroadcaster,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger, stateBroadcaster);
    this.updateSettings = new UpdateSettingsUseCase(settingsRepo);
  }

  public async init() {
    this.logger.info('SettingsService initialized');
    // Set default download path if not configured
    const settings = this.settingsRepo.get();
    if (!settings.general.downloadPath) {
      this.settingsRepo.update({ general: { ...settings.general, downloadPath: app.getPath('downloads') } });
    }
    this.broadcastSettings();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.listenerCleanups.push(
      this.eventBus.on(EventTypes.SETTINGS_CHANGED, (data: Partial<VeilSettings>) => {
        this.logger.debug('Settings changed', data);
      }),
    );
  }

  public destroy(): void {
    this.listenerCleanups.forEach(fn => fn());
    this.listenerCleanups = [];
  }

  private broadcastSettings() {
    this.broadcast({ settings: this.settingsRepo.get() });
  }

  public getSettings(): VeilSettings {
    return this.settingsRepo.get();
  }

  public async handleAction(action: VeilAction) {
    this.logger.debug(`Handling action: ${action.type}`);

    if (action.type === 'SETTINGS_UPDATE' && action.payload) {
      this.updateSettings.execute(action.payload as Partial<VeilSettings>);
      this.broadcastSettings();
      this.eventBus.emit(EventTypes.SETTINGS_CHANGED, action.payload);
    }
  }
}
