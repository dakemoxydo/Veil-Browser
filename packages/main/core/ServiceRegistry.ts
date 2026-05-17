import { ipcMain } from 'electron';
import { VeilAction } from '@veil/shared';
import { StateBroadcaster } from './StateBroadcaster';
import { Logger } from './Logger';
import { ErrorHandler, ErrorSeverity } from './ErrorHandler';

export interface VeilService {
  name: string;
  init(): void | Promise<void>;
  handleAction?(action: VeilAction): void | Promise<void>;
}

export class ServiceRegistry {
  private services: Map<string, VeilService> = new Map();
  private initialized = false;
  private logger: Logger;
  private errorHandler: ErrorHandler;

  constructor() {
    this.logger = new Logger('ServiceRegistry');
    this.errorHandler = ErrorHandler.getInstance();
  }

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

    ipcMain.handle('veil:action', async (_, action: VeilAction) => {
      this.logger.debug(`Action: ${action.type}`);
      for (const service of this.services.values()) {
        if (service.handleAction) {
          try {
            await service.handleAction(action);
          } catch (error) {
            this.errorHandler.handle(
              'SERVICE_ACTION_FAILED',
              `Service ${service.name} failed to handle action ${action.type}: ${error}`,
              ErrorSeverity.MEDIUM,
              'ServiceRegistry'
            );
          }
        }
      }
    });

    ipcMain.handle('veil:get-state', () => {
      return StateBroadcaster.getInstance().getState();
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
