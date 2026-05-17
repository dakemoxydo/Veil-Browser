import { ipcMain } from 'electron';
import { VeilAction } from '@veil/shared';
import { ErrorSeverity } from './ErrorHandler';
import { ILogger, IErrorHandler, IStateBroadcaster } from './interfaces';
import { ActionValidator } from './ActionValidator';
import { RateLimiter } from './RateLimiter';
import { ActionDispatcher } from './ActionDispatcher';

export interface VeilService {
  name: string;
  init(): void | Promise<void>;
  handleAction?(action: VeilAction): void | Promise<void>;
}

export class ServiceRegistry {
  private services: Map<string, VeilService> = new Map();
  private initialized = false;

  constructor(
    private logger: ILogger,
    private errorHandler: IErrorHandler,
    private stateBroadcaster: IStateBroadcaster,
    private validator: ActionValidator,
    private rateLimiter: RateLimiter,
    private dispatcher: ActionDispatcher,
  ) {}

  public register(service: VeilService) {
    this.services.set(service.name, service);
    this.logger.info(`Registered service: ${service.name}`);
  }

  public get(name: string): VeilService | undefined {
    return this.services.get(name);
  }

  public async initAll() {
    if (this.initialized) {
      this.logger.warn('ServiceRegistry already initialized');
      return;
    }
    this.initialized = true;

    ipcMain.handle('veil:action', async (_, action: unknown) => {
      if (!this.validator.isValid(action)) {
        this.logger.warn(`Invalid action rejected: ${JSON.stringify(action)}`);
        return;
      }

      if (!this.rateLimiter.check()) {
        this.logger.warn('Rate limit exceeded for veil:action');
        return;
      }

      await this.dispatcher.dispatch(action, [...this.services.values()]);
    });

    ipcMain.handle('veil:get-state', () => {
      try {
        return this.stateBroadcaster.getState();
      } catch (error) {
        this.errorHandler.handle(
          'GET_STATE_FAILED',
          String(error),
          ErrorSeverity.MEDIUM,
          'ServiceRegistry'
        );
        return null;
      }
    });

    for (const service of this.services.values()) {
      try {
        await service.init();
        this.logger.info(`Initialized service: ${service.name}`);
      } catch (error) {
        this.errorHandler.handle(
          'SERVICE_INIT_FAILED',
          `Service ${service.name} failed to initialize: ${error}`,
          ErrorSeverity.HIGH,
          'ServiceRegistry'
        );
      }
    }
  }
}
