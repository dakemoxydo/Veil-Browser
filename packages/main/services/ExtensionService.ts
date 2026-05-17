import { session, BaseWindow, app, dialog } from 'electron';
import { VeilService } from '../core/ServiceRegistry';
import { VeilAction } from '@veil/shared';
import * as path from 'path';
import * as fs from 'fs';

export class ExtensionService implements VeilService {
  public name = 'ExtensionService';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extensions: any = null; // electron-chrome-extensions has no types
  private webContentsListenerRegistered = false;

  constructor(private window: BaseWindow) {}

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
      console.warn('[Veil] electron-chrome-extensions not found, extensions disabled');
      return;
    }

    try {
      const mod = await import('electron-chrome-extensions');
      const ElectronChromeExtensions = mod.ElectronChromeExtensions;

      this.extensions = new ElectronChromeExtensions({
        session: session.defaultSession,
        license: 'GPL-3.0',
        modulePath: resolvedPath
      });

      if (!this.webContentsListenerRegistered) {
        this.webContentsListenerRegistered = true;
        app.on('web-contents-created', (_, webContents) => {
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
        });
      }

      console.log('[Veil] ExtensionService initialized');
    } catch (error) {
      console.warn('[Veil] Failed to load electron-chrome-extensions:', error);
    }
  }

  public async handleAction(action: VeilAction) {
    if (!this.extensions) return;

    switch (action.type) {
      case 'EXT_LOAD_UNPACKED': {
        const { path: extPath } = action.payload;
        if (!extPath || typeof extPath !== 'string') {
          console.error('[Veil] Invalid extension path');
          return;
        }
        try {
          await session.defaultSession.loadExtension(extPath);
          console.log(`[Veil] Extension loaded from: ${extPath}`);
        } catch (error) {
          console.error(`[Veil] Failed to load extension:`, error);
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
}
