import { BrowserWindow, WebContentsView, Menu } from 'electron';
import { ViewManager } from './ViewManager';
import { ConfigManager } from './AppConfig';

export class VeilWindow {
  public window: BrowserWindow;
  public viewManager: ViewManager;

  constructor() {
    Menu.setApplicationMenu(null);

    // BrowserWindow with its own webContents — no separate WebContentsView needed
    this.window = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      backgroundColor: '#202124',
      show: false,
      webPreferences: {
        preload: ConfigManager.getInstance().getPreloadPath(),
        contextIsolation: true,
        sandbox: true,
      },
    });

    this.viewManager = new ViewManager(this.window);

    // Block renderer navigation to unsafe protocols (XSS mitigation)
    this.window.webContents.on('will-navigate', (event, url) => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && parsed.protocol !== 'file:') {
          event.preventDefault();
        }
      } catch {
        event.preventDefault();
      }
    });

    // Show window when content is loaded
    this.window.webContents.once('did-finish-load', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.show();
      }
    });

    // Fallback: show window after 5s even if load fails
    const showTimeout = setTimeout(() => {
      if (this.window && !this.window.isDestroyed() && !this.window.isVisible()) {
        this.window.show();
      }
    }, 5000);

    this.window.webContents.once('did-finish-load', () => clearTimeout(showTimeout));
    this.window.webContents.once('did-fail-load', () => {
      clearTimeout(showTimeout);
      if (this.window && !this.window.isDestroyed()) {
        this.window.show();
      }
    });

    this.window.on('closed', () => {
      clearTimeout(showTimeout);
      this.viewManager.cleanup();
    });
  }

  public loadApp(url: string) {
    this.window.webContents.loadURL(url).catch((error) => {
      console.error('[Veil] Failed to load app URL:', error);
    });
  }

  public getWebContents() {
    return this.window.webContents;
  }
}
