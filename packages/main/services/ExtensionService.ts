import { BaseWindow, dialog, app } from 'electron';
import { VeilService } from '../core/ServiceRegistry';
import { VeilAction } from '@veil/shared';
import { ILogger } from '../core/interfaces';
import { ISession } from '../core/ports/ISession';
import * as path from 'path';
import * as fs from 'fs';

interface ChromeExtensionsInstance {
  addTab(webContents: Electron.WebContents, window: Electron.BaseWindow): void;
}

export class ExtensionService implements VeilService {
  public name = 'ExtensionService';
  private extensions: ChromeExtensionsInstance | null = null;
  private webContentsHandler: ((event: Electron.Event, webContents: Electron.WebContents) => void) | null = null;

  constructor(
    private session: ISession,
    private window: BaseWindow,
    private logger: ILogger,
  ) {}

  public async init() {
    const possiblePaths = [
      path.join(__dirname, '../../node_modules/electron-chrome-extensions'),
      path.join(app.getAppPath(), 'node_modules/electron-chrome-extensions'),
    ];

    if (app.isPackaged && process.resourcesPath) {
      possiblePaths.push(
        path.join(process.resourcesPath, 'app.asar.unpacked/node_modules/electron-chrome-extensions'),
        path.join(process.resourcesPath, 'node_modules/electron-chrome-extensions')
      );
    }

    let resolvedPath = '';
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          resolvedPath = p;
          break;
        }
      } catch {
        // path doesn't exist
      }
    }

    if (!resolvedPath) {
      this.logger.warn('electron-chrome-extensions not found, extensions disabled');
      return;
    }

    try {
      const mod = await import('electron-chrome-extensions');
      const ElectronChromeExtensions = mod.ElectronChromeExtensions;

      const electronSession = (await import('electron')).session;
      this.extensions = new ElectronChromeExtensions({
        session: electronSession.defaultSession,
        license: 'GPL-3.0',
        modulePath: resolvedPath
      });

      if (!this.webContentsHandler) {
        this.webContentsHandler = (_, webContents) => {
          const url = webContents.getURL();
          if (
            url &&
            !url.startsWith('about:') &&
            !url.startsWith('chrome-devtools://') &&
            !url.startsWith('chrome-extension://') &&
            !url.startsWith('chrome://')
          ) {
            this.extensions?.addTab(webContents, this.window);
          }
        };
        app.on('web-contents-created', this.webContentsHandler);
      }

      this.logger.info('ExtensionService initialized');
    } catch (error) {
      this.logger.warn('Failed to load electron-chrome-extensions', error);
    }
  }

  public async handleAction(action: VeilAction) {
    if (!this.extensions) return;

    switch (action.type) {
      case 'EXT_LOAD_UNPACKED': {
        const extPath = action.payload?.path;
        if (!extPath || typeof extPath !== 'string') {
          this.logger.error('Invalid extension path');
          return;
        }
        // Resolve to absolute path and verify it exists as a directory
        const resolved = path.resolve(extPath);
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
          this.logger.error(`Extension path is not a valid directory: ${extPath}`);
          return;
        }
        try {
          await this.session.loadExtension(resolved);
          this.logger.info(`Extension loaded from: ${resolved}`);
        } catch (error) {
          this.logger.error('Failed to load extension', error);
        }
        break;
      }
      case 'EXT_DIALOG_OPEN': {
        const result = await dialog.showOpenDialog(this.window, {
          properties: ['openDirectory'],
        });

        if (!result.canceled && result.filePaths.length > 0) {
          await this.handleAction({
            type: 'EXT_LOAD_UNPACKED',
            payload: { path: result.filePaths[0] }
          });
        }
        break;
      }
    }
  }

  public getExtensions() {
    return this.extensions;
  }

  public destroy(): void {
    if (this.webContentsHandler) {
      app.removeListener('web-contents-created', this.webContentsHandler);
      this.webContentsHandler = null;
    }
  }
}
