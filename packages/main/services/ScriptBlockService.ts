import { ILogger, IEventBus, IErrorHandler, IStateBroadcaster } from '../core/interfaces';
import { ISession } from '../core/ports/ISession';
import { BaseService } from '../core/BaseService';
import { VeilAction } from '@veil/shared';

interface SiteBlockEntry {
  hostname: string;
  blocked: boolean;
}

/**
 * Per-site JavaScript blocking (NoScript-like).
 * Blocks JavaScript execution on specified domains.
 */
export class ScriptBlockService extends BaseService {
  public name = 'ScriptBlockService';
  private blockedSites: Map<string, boolean> = new Map(); // hostname -> blocked

  constructor(
    private session: ISession,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    logger: ILogger,
    stateBroadcaster: IStateBroadcaster,
  ) {
    super(eventBus, errorHandler, logger, stateBroadcaster);
  }

  public async init() {
    this.logger.info('ScriptBlockService initialized');
  }

  public isBlocked(hostname: string): boolean {
    return this.blockedSites.get(hostname) === true;
  }

  public setBlocked(hostname: string, blocked: boolean): void {
    this.blockedSites.set(hostname, blocked);
    this.broadcastState();
    this.logger.info(`Script blocking for ${hostname}: ${blocked ? 'blocked' : 'allowed'}`);
  }

  public toggleBlocked(hostname: string): void {
    const current = this.blockedSites.get(hostname) === true;
    this.setBlocked(hostname, !current);
  }

  public getList(): SiteBlockEntry[] {
    return Array.from(this.blockedSites.entries()).map(([hostname, blocked]) => ({ hostname, blocked }));
  }

  private broadcastState() {
    this.broadcast({
      scriptBlockList: this.getList(),
    });
  }

  public async handleAction(action: VeilAction) {
    if (action.type === 'SCRIPT_BLOCK_TOGGLE' && action.payload?.hostname) {
      this.toggleBlocked(action.payload.hostname);
    } else if (action.type === 'SCRIPT_BLOCK_SITE' && action.payload?.hostname) {
      this.setBlocked(action.payload.hostname, action.payload.blocked);
    }
  }

  public destroy(): void {
    this.blockedSites.clear();
  }
}
