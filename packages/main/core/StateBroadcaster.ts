import { WebContents } from 'electron';
import { VeilState, DEFAULT_SETTINGS } from '@veil/shared';
import { ErrorSeverity } from './ErrorHandler';
import { IErrorHandler, IStateBroadcaster } from './interfaces';

export class StateBroadcaster implements IStateBroadcaster {
  private static instance: StateBroadcaster;
  private webContents: WebContents | null = null;
  private state: VeilState = {
    tabs: [],
    activeTabId: null,
    privacyStats: {
      blockedTotal: 0,
      blockedCurrent: 0,
    },
    logs: [],
    bookmarks: [],
    downloads: [],
    settings: { ...DEFAULT_SETTINGS },
  };

  constructor(private errorHandler: IErrorHandler) {}

  /** @deprecated Use constructor injection instead */
  public static getInstance(): StateBroadcaster {
    if (!StateBroadcaster.instance) {
      // Lazy imports to avoid circular dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ErrorHandler } = require('./ErrorHandler');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { EventBus } = require('./EventBus');
      StateBroadcaster.instance = new StateBroadcaster(new ErrorHandler(new EventBus()));
    }
    return StateBroadcaster.instance;
  }

  public setWebContents(webContents: WebContents) {
    this.webContents = webContents;
  }

  public getState(): VeilState {
    return this.state;
  }

  public patch(patch: Partial<VeilState>) {
    this.state = {
      ...this.state,
      ...patch,
      privacyStats: patch.privacyStats
        ? { ...this.state.privacyStats, ...patch.privacyStats }
        : this.state.privacyStats,
      settings: patch.settings
        ? { ...this.state.settings, ...patch.settings, general: { ...this.state.settings.general, ...patch.settings.general }, privacy: { ...this.state.settings.privacy, ...patch.settings.privacy }, appearance: { ...this.state.settings.appearance, ...patch.settings.appearance } }
        : this.state.settings,
    };
    if (this.webContents && !this.webContents.isDestroyed()) {
      try {
        this.webContents.send('veil:state-patch', this.state);
      } catch (error) {
        this.errorHandler.handle(
          'STATE_BROADCAST_FAILED',
          String(error),
          ErrorSeverity.MEDIUM,
          'StateBroadcaster'
        );
      }
    }
  }
}
