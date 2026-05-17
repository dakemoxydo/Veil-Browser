import { WebContents } from 'electron';
import { VeilState, DEFAULT_SETTINGS } from '@veil/shared';
import { ErrorHandler, ErrorSeverity } from './ErrorHandler';

export class StateBroadcaster {
  private static instance: StateBroadcaster;
  private webContents: WebContents | null = null;
  private errorHandler: ErrorHandler;
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

  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
  }

  public static getInstance(): StateBroadcaster {
    if (!StateBroadcaster.instance) {
      StateBroadcaster.instance = new StateBroadcaster();
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
