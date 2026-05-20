import { session } from 'electron';
import { VeilAction, ProxySettings } from '@veil/shared';
import { IEventBus, IErrorHandler, ILogger, IStateBroadcaster } from '../core/interfaces';
import { ISettingsRepository } from '../core/repositories/ISettingsRepository';
import { BaseService } from '../core/BaseService';

export class ProxyService extends BaseService {
  public name = 'ProxyService';

  constructor(
    private settingsRepo: ISettingsRepository,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    stateBroadcaster: IStateBroadcaster,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger, stateBroadcaster);
  }

  public async init() {
    this.logger.info('ProxyService initialized');
    await this.applyProxy();
  }

  public async applyProxy(): Promise<void> {
    const settings = this.settingsRepo.get();
    const proxy = settings.proxy;
    if (!proxy) return;

    const defaultSession = session.defaultSession;

    switch (proxy.mode) {
      case 'direct':
        await defaultSession.setProxy({ proxyRules: 'direct://' });
        break;
      case 'system':
        await defaultSession.setProxy({ mode: 'system' });
        break;
      case 'manual': {
        if (proxy.host && proxy.port) {
          const protocol = proxy.protocol === 'socks5' ? 'socks5' : 'http';
          const proxyRules = `${protocol}://${proxy.host}:${proxy.port}`;
          await defaultSession.setProxy({ proxyRules });
        }
        break;
      }
    }

    this.logger.info(`Proxy applied: ${proxy.mode}`);
  }

  public async setConfig(config: ProxySettings): Promise<void> {
    const current = this.settingsRepo.get();
    this.settingsRepo.update({
      proxy: { ...current.proxy, ...config },
    });
    await this.applyProxy();
    this.broadcast({ settings: this.settingsRepo.get() });
  }

  public getConfig(): ProxySettings {
    return this.settingsRepo.get().proxy;
  }

  public async handleAction(_action: VeilAction) {
    // Proxy actions are handled via direct IPC, not through the action system
  }
}
