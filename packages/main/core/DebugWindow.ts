import { BaseWindow, WebContentsView } from 'electron';
import { ConfigManager } from './AppConfig';

export class DebugWindow {
  public window: BaseWindow | null = null;
  private webView: WebContentsView | null = null;

  public create(): BaseWindow {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return this.window;
    }

    const config = ConfigManager.getInstance();

    this.window = new BaseWindow({
      width: 700,
      height: 500,
      minWidth: 400,
      minHeight: 300,
      backgroundColor: '#202124',
      frame: false,
      show: false,
      // Don't count this window for 'window-all-closed'
      skipTaskbar: false,
    });

    this.webView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: config.getPreloadPath(),
      },
    });

    this.window.contentView.addChildView(this.webView);

    // Set initial bounds
    const [width, height] = this.window.getSize();
    this.webView.setBounds({ x: 0, y: 0, width, height });

    // Update bounds on resize
    this.window.on('resize', () => {
      if (this.webView && this.window && !this.window.isDestroyed()) {
        const [w, h] = this.window.getSize();
        this.webView.setBounds({ x: 0, y: 0, width: w, height: h });
      }
    });

    const url = `${ConfigManager.getInstance().getRendererUrl()}/#/debug`;

    this.webView.webContents.loadURL(url);

    // Show after content loads
    this.webView.webContents.once('did-finish-load', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.show();
      }
    });

    this.window.on('closed', () => {
      this.window = null;
      this.webView = null;
    });

    return this.window;
  }

  public addLog(log: unknown): void {
    if (this.webView && this.window && !this.window.isDestroyed()) {
      this.webView.webContents.send('veil:log', log);
    }
  }

  public close() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
  }

  public focus() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
    }
  }

  public isVisible(): boolean {
    return this.window !== null && !this.window.isDestroyed() && this.window.isVisible();
  }

  public getWebContents() {
    return this.webView?.webContents;
  }
}
