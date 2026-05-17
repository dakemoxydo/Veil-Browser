import { ipcMain } from 'electron';
import { VeilAction } from '@veil/shared';
import { StateBroadcaster } from './StateBroadcaster';
import { Logger } from './Logger';
import { ErrorHandler, ErrorSeverity } from './ErrorHandler';

const VALID_ACTION_TYPES = new Set([
  'TAB_NEW', 'TAB_CLOSE', 'TAB_NAVIGATE', 'TAB_FOCUS',
  'TAB_GO_BACK', 'TAB_GO_FORWARD', 'TAB_RELOAD', 'TAB_GO_HOME',
  'EXT_LOAD_UNPACKED', 'EXT_DIALOG_OPEN', 'ADBLOCK_TOGGLE',
  'BOOKMARK_ADD', 'BOOKMARK_REMOVE', 'HISTORY_CLEAR',
  'DOWNLOAD_CANCEL', 'DOWNLOAD_OPEN', 'DOWNLOAD_SHOW_IN_FOLDER',
  'SETTINGS_UPDATE',
]);

const ACTIONS_REQUIRING_ID = new Set([
  'TAB_CLOSE', 'TAB_NAVIGATE', 'TAB_FOCUS', 'TAB_GO_BACK',
  'TAB_GO_FORWARD', 'TAB_RELOAD', 'TAB_GO_HOME',
  'DOWNLOAD_CANCEL', 'DOWNLOAD_OPEN', 'DOWNLOAD_SHOW_IN_FOLDER',
  'BOOKMARK_REMOVE',
]);

function isValidAction(action: unknown): action is VeilAction {
  if (!action || typeof action !== 'object') return false;
  const a = action as Record<string, unknown>;
  if (typeof a.type !== 'string') return false;
  if (!VALID_ACTION_TYPES.has(a.type)) return false;
  if (ACTIONS_REQUIRING_ID.has(a.type)) {
    const payload = a.payload as Record<string, unknown> | undefined;
    if (!payload || typeof payload.id !== 'string' || payload.id.length === 0) return false;
  }
  return true;
}

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

  // Rate limiting for veil:action
  private actionTimestamps: number[] = [];
  private static readonly MAX_ACTIONS_PER_SECOND = 100;

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

  private checkRateLimit(): boolean {
    const now = Date.now();
    this.actionTimestamps = this.actionTimestamps.filter(t => now - t < 1000);
    if (this.actionTimestamps.length >= ServiceRegistry.MAX_ACTIONS_PER_SECOND) {
      return false;
    }
    this.actionTimestamps.push(now);
    return true;
  }

  public async initAll() {
    if (this.initialized) {
      this.logger.warn('ServiceRegistry already initialized');
      return;
    }
    this.initialized = true;

    ipcMain.handle('veil:action', async (_, action: unknown) => {
      if (!isValidAction(action)) {
        this.logger.warn(`Invalid action rejected: ${JSON.stringify(action)}`);
        return;
      }

      if (!this.checkRateLimit()) {
        this.logger.warn('Rate limit exceeded for veil:action');
        return;
      }

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
      try {
        return StateBroadcaster.getInstance().getState();
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
