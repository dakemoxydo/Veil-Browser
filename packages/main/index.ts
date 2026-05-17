import { app, ipcMain, globalShortcut, BrowserWindow } from 'electron';
import { VeilWindow } from './core/VeilWindow';
import { DebugWindow } from './core/DebugWindow';
import { ServiceRegistry } from './core/ServiceRegistry';
import { Logger } from './core/Logger';
import { EventBus } from './core/EventBus';
import { ErrorHandler } from './core/ErrorHandler';
import { StateBroadcaster } from './core/StateBroadcaster';
import { ConfigManager } from './core/AppConfig';
import { NewTabService } from './application/services/NewTabService';
import { NewBookmarkService } from './application/services/NewBookmarkService';
import { NewHistoryService } from './application/services/NewHistoryService';
import { NewDownloadService } from './application/services/NewDownloadService';
import { NewSettingsService } from './application/services/NewSettingsService';
import { PersistenceService } from './application/services/PersistenceService';
import { ExtensionService } from './services/ExtensionService';
import { AdblockService } from './services/AdblockService';
import { ContextMenuService } from './services/ContextMenuService';
import { randomUUID } from 'crypto';
import { LogLevel as SharedLogLevel } from '@veil/shared';

// Core infrastructure (injection order matters)
const eventBus = new EventBus();
const errorHandler = new ErrorHandler(eventBus);
const stateBroadcaster = new StateBroadcaster(errorHandler);
const config = ConfigManager.getInstance();
const logger = new Logger('Main', eventBus);
const persistence = new PersistenceService(errorHandler);

const registry = new ServiceRegistry(
  new Logger('ServiceRegistry', eventBus),
  errorHandler,
  stateBroadcaster,
);

let mainWindow: VeilWindow | null = null;
let debugWindow: DebugWindow | null = null;
let ipcRegistered = false;

function registerIpcHandlers() {
  if (ipcRegistered) return;
  ipcRegistered = true;

  ipcMain.handle('veil:window-minimize', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.minimize();
        return { success: true };
      }
      return { success: false, error: 'Window not available' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:window-maximize', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        if (win.isMaximized()) {
          win.unmaximize();
        } else {
          win.maximize();
        }
        return { success: true };
      }
      return { success: false, error: 'Window not available' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:window-close', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        win.close();
        return { success: true };
      }
      return { success: false, error: 'Window not available' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:open-debug', async () => {
    try {
      if (debugWindow) {
        debugWindow.create();
        return { success: true };
      }
      return { success: false, error: 'DebugWindow not available' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:close-debug', async () => {
    try {
      if (debugWindow) {
        debugWindow.close();
        return { success: true };
      }
      return { success: false, error: 'DebugWindow not available' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:add-log', async (_, log: { level: SharedLogLevel; source: string; message: string; data?: unknown }) => {
    try {
      const logEntry = {
        id: randomUUID(),
        timestamp: Date.now(),
        level: log.level,
        source: log.source,
        message: log.message,
        data: log.data,
      };
      if (debugWindow?.window && !debugWindow.window.isDestroyed()) {
        debugWindow.getWebContents()?.send('veil:log', logEntry);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:set-shell-offset', async (_, offset: number) => {
    try {
      if (mainWindow?.viewManager) {
        mainWindow.viewManager.setShellOffset(offset);
        return { success: true };
      }
      return { success: false, error: 'ViewManager not available' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:set-view-mode', async (_, mode: 'browser' | 'settings') => {
    try {
      if (mainWindow?.viewManager) {
        if (mode === 'settings') {
          mainWindow.viewManager.hideAllViews();
        } else {
          mainWindow.viewManager.showAllViews();
        }
        return { success: true };
      }
      return { success: false, error: 'ViewManager not available' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}

async function bootstrap() {
  logger.info('Starting Veil Browser');
  await app.whenReady();

  mainWindow = new VeilWindow();
  stateBroadcaster.setWebContents(mainWindow.getWebContents());

  debugWindow = new DebugWindow();

  registerIpcHandlers();

  // Create services with injected dependencies
  const settingsService = new NewSettingsService(
    eventBus, errorHandler, stateBroadcaster,
    new Logger('SettingsService', eventBus), persistence
  );

  const tabService = new NewTabService(
    mainWindow.viewManager, eventBus, errorHandler, stateBroadcaster,
    new Logger('TabService', eventBus)
  );

  const historyService = new NewHistoryService(
    eventBus, errorHandler,
    new Logger('HistoryService', eventBus), persistence
  );

  const bookmarkService = new NewBookmarkService(
    eventBus, errorHandler, stateBroadcaster,
    new Logger('BookmarkService', eventBus), persistence
  );

  const downloadService = new NewDownloadService(
    eventBus, errorHandler, stateBroadcaster,
    new Logger('DownloadService', eventBus)
  );

  const contextMenuService = new ContextMenuService(
    mainWindow.window, tabService, settingsService,
    eventBus, errorHandler, new Logger('ContextMenuService', eventBus)
  );

  const extensionService = new ExtensionService(mainWindow.window);

  const adblockService = new AdblockService(
    settingsService, stateBroadcaster, eventBus, errorHandler,
    new Logger('AdblockService', eventBus)
  );

  // Register services
  registry.register(settingsService);
  registry.register(tabService);
  registry.register(historyService);
  registry.register(bookmarkService);
  registry.register(downloadService);
  registry.register(contextMenuService);
  registry.register(extensionService);
  registry.register(adblockService);

  await registry.initAll();

  registerShortcuts();

  const url = config.getRendererUrl();
  mainWindow.loadApp(url);
  logger.info(`Loading renderer: ${url}`);
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (debugWindow) {
      if (debugWindow.isVisible()) {
        debugWindow.focus();
      } else {
        debugWindow.create();
      }
    }
  });

  globalShortcut.register('CommandOrControl+T', () => {
    const tabSvc = registry.get('TabService');
    if (tabSvc?.handleAction) {
      tabSvc.handleAction({ type: 'TAB_NEW', payload: {} });
    }
  });

  globalShortcut.register('CommandOrControl+W', () => {
    if (mainWindow?.window && !mainWindow.window.isDestroyed()) {
      mainWindow.getWebContents().send('veil:shortcut', 'close-tab');
    }
  });

  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow?.window && !mainWindow.window.isDestroyed()) {
      mainWindow.getWebContents().send('veil:shortcut', 'reload');
    }
  });

  globalShortcut.register('CommandOrControl+F', () => {
    if (mainWindow?.window && !mainWindow.window.isDestroyed()) {
      mainWindow.getWebContents().send('veil:shortcut', 'find');
    }
  });

  globalShortcut.register('F11', () => {
    if (mainWindow?.window && !mainWindow.window.isDestroyed()) {
      mainWindow.window.setFullScreen(!mainWindow.window.isFullScreen());
    }
  });

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow?.window && !mainWindow.window.isDestroyed()) {
      mainWindow.getWebContents().toggleDevTools();
    }
  });
}

// Flush pending saves before quitting
app.on('before-quit', () => {
  PersistenceService.flushAll();
});

// Main window closed → quit the app
app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (debugWindow) {
    debugWindow.close();
  }
  mainWindow = null;
  debugWindow = null;
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (process.platform === 'darwin' && !mainWindow) {
    bootstrap();
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  PersistenceService.flushAll();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

bootstrap().catch(err => {
  logger.error('Bootstrap failed', err);
  app.quit();
});
