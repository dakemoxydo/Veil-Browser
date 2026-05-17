import { BaseWindow, WebContentsView, Menu, app } from 'electron';
import * as path from 'path';
import { ViewManager } from './ViewManager';

Menu.setApplicationMenu(null);

export class VeilWindow {
  public window: BaseWindow;
  public viewManager: ViewManager;
  private webView: WebContentsView;

  constructor() {
    const preloadPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar', 'packages', 'main', 'dist', 'preload.js')
      : path.join(__dirname, '../preload.js');

    this.window = new BaseWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      backgroundColor: '#202124',
      show: false,
    });

    this.webView = new WebContentsView({
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        sandbox: true,
      },
    });

    this.window.contentView.addChildView(this.webView);

    // Set initial bounds to fill the window
    const [width, height] = this.window.getSize();
    this.webView.setBounds({ x: 0, y: 0, width, height });

    // Update bounds on resize
    this.window.on('resize', () => {
      if (this.webView && this.window && !this.window.isDestroyed()) {
        const [w, h] = this.window.getSize();
        this.webView.setBounds({ x: 0, y: 0, width: w, height: h });
      }
    });

    this.viewManager = new ViewManager(this.window);

    // Show window when content is loaded
    this.webView.webContents.once('did-finish-load', () => {
      if (this.window && !this.window.isDestroyed()) {
        this.window.show();
      }
    });

    this.window.on('closed', () => {
      this.viewManager.cleanup();
    });

    if (process.env.DEBUG) {
      this.webView.webContents.openDevTools({ mode: 'detach' });
    }
  }

  public loadApp(url: string) {
    this.webView.webContents.loadURL(url).catch((error) => {
      console.error('[Veil] Failed to load app URL:', error);
    });
  }

  public getWebContents() {
    return this.webView.webContents;
  }
}
