import { WebContents } from 'electron';
import { VeilState, DEFAULT_SETTINGS } from '@veil/shared';
import { ErrorSeverity } from './ErrorHandler';
import { IErrorHandler, IStateBroadcaster } from './interfaces';

export class StateBroadcaster implements IStateBroadcaster {
  private webContents: WebContents | null = null;
  private state: VeilState = {
    tabs: [],
    activeTabId: null,
    recentlyClosed: [],
    tabGroups: [],
    privacyStats: {
      blockedTotal: 0,
      blockedCurrent: 0,
      blockedAds: 0,
      blockedTrackers: 0,
      httpsUpgrades: 0,
      cookiesBlocked: 0,
    },
    logs: [],
    bookmarks: [],
    downloads: [],
    settings: { ...DEFAULT_SETTINGS },
    certExceptions: [],
    scriptBlockList: [],
    zoomLevel: 0,
  };
  // Track which keys have been patched since last broadcast
  private dirtyKeys = new Set<keyof VeilState>();

  constructor(private errorHandler: IErrorHandler) {}

  public setWebContents(webContents: WebContents) {
    this.webContents = webContents;
    // Force full state on next broadcast
    this.dirtyKeys = new Set(['tabs', 'activeTabId', 'privacyStats', 'bookmarks', 'downloads', 'settings']);
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
    // Mark patched keys as dirty
    for (const key of Object.keys(patch) as (keyof VeilState)[]) {
      this.dirtyKeys.add(key);
    }
    this.broadcast();
  }

  private broadcast() {
    if (this.webContents && !this.webContents.isDestroyed()) {
      try {
        const delta = this.computeDelta();
        if (Object.keys(delta).length === 0) return;
        this.webContents.send('veil:state-patch', delta);
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

  private computeDelta(): Partial<VeilState> {
    const delta: Partial<VeilState> = {};
    for (const key of this.dirtyKeys) {
      if (key === 'logs') continue; // Logs are renderer-local
      (delta as Record<string, unknown>)[key] = this.state[key];
    }
    this.dirtyKeys.clear();
    return delta;
  }
}
