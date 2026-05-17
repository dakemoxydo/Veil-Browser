import { BaseWindow, WebContentsView, app } from 'electron';
import * as path from 'path';

export class DebugWindow {
  private static instance: DebugWindow | null = null;
  public window: BaseWindow | null = null;
  private webView: WebContentsView | null = null;

  public static getInstance(): DebugWindow {
    if (!DebugWindow.instance) {
      DebugWindow.instance = new DebugWindow();
    }
    return DebugWindow.instance;
  }

  public create(): BaseWindow {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return this.window;
    }

    const preloadPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar', 'packages', 'main', 'dist', 'preload.js')
      : path.join(__dirname, '../preload.js');

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
        preload: preloadPath,
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

    const isDev = process.env.NODE_ENV === 'development';
    const url = isDev
      ? 'http://localhost:3000/#/debug'
      : `file://${path.join(app.getAppPath(), 'packages/renderer/dist/index.html')}#/debug`;

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
