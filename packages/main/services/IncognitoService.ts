import { BrowserWindow, session } from 'electron';
import { VeilAction } from '@veil/shared';
import { IEventBus, IErrorHandler, ILogger } from '../core/interfaces';
import { ConfigManager } from '../core/AppConfig';
import { BaseService } from '../core/BaseService';

export class IncognitoService extends BaseService {
  public name = 'IncognitoService';
  private incognitoWindow: BrowserWindow | null = null;
  private partitionName = 'incognito';

  constructor(
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger);
  }

  public async init() {
    this.logger.info('IncognitoService initialized');
  }

  public async handleAction(_action: VeilAction) {}

  public openIncognitoWindow() {
    if (this.incognitoWindow && !this.incognitoWindow.isDestroyed()) {
      this.incognitoWindow.focus();
      return;
    }

    // Ephemeral session — data never written to disk
    const incognitoSession = session.fromPartition(this.partitionName, { cache: false });

    const config = ConfigManager.getInstance();

    // Use BrowserWindow's own webContents — no separate WebContentsView
    // A child WebContentsView would be blocked by the window's empty webContents
    this.incognitoWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      backgroundColor: '#202124',
      show: false,
      title: 'Veil Browser — Incognito',
      webPreferences: {
        preload: config.getPreloadPath().replace('preload.js', 'preload-incognito.js'),
        contextIsolation: true,
        sandbox: true,
        session: incognitoSession,
      },
    });

    const url = config.getRendererUrl();

    this.incognitoWindow.webContents.loadURL(url).catch((err) => {
      this.logger.error('Failed to load incognito window', err);
    });

    this.incognitoWindow.once('ready-to-show', () => {
      if (this.incognitoWindow && !this.incognitoWindow.isDestroyed()) {
        this.incognitoWindow.show();
      }
    });

    // Fallback: show after 5s even if load fails
    const showTimeout = setTimeout(() => {
      if (this.incognitoWindow && !this.incognitoWindow.isDestroyed() && !this.incognitoWindow.isVisible()) {
        this.incognitoWindow.show();
      }
    }, 5000);

    this.incognitoWindow.webContents.once('did-finish-load', () => clearTimeout(showTimeout));
    this.incognitoWindow.webContents.once('did-fail-load', () => {
      clearTimeout(showTimeout);
      if (this.incognitoWindow && !this.incognitoWindow.isDestroyed()) {
        this.incognitoWindow.show();
      }
    });

    // Clear session data on close
    this.incognitoWindow.on('closed', () => {
      clearTimeout(showTimeout);
      incognitoSession.clearStorageData().catch(() => {});
      incognitoSession.clearCache().catch(() => {});
      this.incognitoWindow = null;
    });
  }

  public closeIncognitoWindow() {
    if (this.incognitoWindow && !this.incognitoWindow.isDestroyed()) {
      this.incognitoWindow.close();
    }
  }

  public isOpen(): boolean {
    return this.incognitoWindow !== null && !this.incognitoWindow.isDestroyed();
  }

  public destroy(): void {
    this.closeIncognitoWindow();
  }
}
