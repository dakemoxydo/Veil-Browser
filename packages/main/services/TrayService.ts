import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import { ILogger } from '../core/interfaces';
import { VeilService } from '../core/ServiceRegistry';

/**
 * System tray icon with context menu.
 * Allows minimize to tray and quick access to browser functions.
 */
export class TrayService implements VeilService {
  public name = 'TrayService';
  private tray: Tray | null = null;
  private minimizeToTray = false;

  constructor(
    private getLogger: () => ILogger,
    private getWindow: () => BrowserWindow | null,
  ) {}

  public async init() {
    this.getLogger().info('TrayService initialized');
  }

  public setMinimizeToTray(value: boolean): void {
    this.minimizeToTray = value;
  }

  public isMinimizeToTray(): boolean {
    return this.minimizeToTray;
  }

  public createTray(): void {
    if (this.tray) return;

    // Create a simple 16x16 icon
    const icon = nativeImage.createEmpty();
    this.tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Veil Browser',
        click: () => {
          const win = this.getWindow();
          if (win) {
            win.show();
            win.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'New Incognito Window',
        click: () => {
          const win = this.getWindow();
          if (win) {
            win.webContents.send('veil:shortcut', 'incognito');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.minimizeToTray = false;
          app.quit();
        },
      },
    ]);

    this.tray.setToolTip('Veil Browser');
    this.tray.setContextMenu(contextMenu);

    this.tray.on('double-click', () => {
      const win = this.getWindow();
      if (win) {
        win.show();
        win.focus();
      }
    });
  }

  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
