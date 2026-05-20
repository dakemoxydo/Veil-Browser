import { app, ipcMain, BrowserWindow, session, dialog } from 'electron';
import * as os from 'os';
import { VeilWindow } from './core/VeilWindow';
import { DebugWindow } from './core/DebugWindow';
import { ServiceRegistry } from './core/ServiceRegistry';
import { Logger } from './core/Logger';
import { EventBus } from './core/EventBus';
import { ErrorHandler } from './core/ErrorHandler';
import { StateBroadcaster } from './core/StateBroadcaster';
import { ConfigManager } from './core/AppConfig';
import { ActionValidator } from './core/ActionValidator';
import { RateLimiter } from './core/RateLimiter';
import { ActionDispatcher } from './core/ActionDispatcher';
import { TabService } from './application/services/TabService';
import { BookmarkService } from './application/services/BookmarkService';
import { HistoryService } from './application/services/HistoryService';
import { DownloadService } from './application/services/DownloadService';
import { SettingsService } from './application/services/SettingsService';
import { PersistenceService } from './application/services/PersistenceService';
import { ExtensionService } from './services/ExtensionService';
import { AdblockService } from './services/AdblockService';
import { ContextMenuService } from './services/ContextMenuService';
import { FingerprintProtectionService } from './services/FingerprintProtectionService';
import { IncognitoService } from './services/IncognitoService';
import { CookieService } from './services/CookieService';
import { HttpsUpgradeService } from './services/HttpsUpgradeService';
import { ProxyService } from './services/ProxyService';
import { PasswordService } from './services/PasswordService';
import { ProfileService } from './services/ProfileService';
import { ScriptBlockService } from './services/ScriptBlockService';
import { CertificateExceptionService } from './services/CertificateExceptionService';
import { TabRepository } from './infrastructure/repositories/TabRepository';
import { BookmarkRepository } from './infrastructure/repositories/BookmarkRepository';
import { HistoryRepository } from './infrastructure/repositories/HistoryRepository';
import { DownloadRepository } from './infrastructure/repositories/DownloadRepository';
import { SettingsRepository } from './infrastructure/repositories/SettingsRepository';
import { ElectronSession } from './infrastructure/adapters/ElectronSession';
import { ViewManagerAdapter } from './infrastructure/adapters/ViewManagerAdapter';

// Debug Window
let debugWindow: DebugWindow | null = null;

// Re-entry guard for macOS activate handler
let appInitialized = false;

// References to current instances for cleanup on re-init
let currentPersistence: PersistenceService | null = null;
let currentMainWindow: VeilWindow | null = null;
let currentAdblock: AdblockService | null = null;
let currentContextMenu: ContextMenuService | null = null;
let currentExtension: ExtensionService | null = null;
let currentDownload: DownloadService | null = null;
let currentFingerprint: FingerprintProtectionService | null = null;
let currentCookie: CookieService | null = null;
let currentHttps: HttpsUpgradeService | null = null;
let currentIncognito: IncognitoService | null = null;
let currentProxy: ProxyService | null = null;
let currentPassword: PasswordService | null = null;
let currentProfile: ProfileService | null = null;
let currentSessionAdapter: ElectronSession | null = null;
let currentTabService: TabService | null = null;
let currentBookmarkService: BookmarkService | null = null;
let currentHistoryService: HistoryService | null = null;
let currentSettingsService: SettingsService | null = null;

// IPC handler channels — used for cleanup on re-init
const IPC_CHANNELS = [
  'veil:window-minimize', 'veil:window-maximize', 'veil:window-close',
  'veil:open-debug', 'veil:close-debug', 'veil:set-shell-offset',
  'veil:set-view-mode', 'veil:add-log', 'veil:action', 'veil:get-state',
  'veil:search-suggestions',
  'veil:set-overlay-visible',
  'veil:find-in-page', 'veil:stop-find', 'veil:clear-cookies',
  'veil:history-list', 'veil:history-clear',
  'veil:incognito-open', 'veil:incognito-close',
  'veil:version',
  'veil:set-zoom-level', 'veil:privacy-stats', 'veil:clear-browsing-data',
  'veil:cookie-list', 'veil:cookie-delete', 'veil:set-default-browser',
  'veil:save-page', 'veil:toggle-reader-mode',
  // Phase 6: Profile management
  'veil:profile-list', 'veil:profile-create', 'veil:profile-switch', 'veil:profile-delete',
  // Phase 6: Custom adblock lists
  'veil:adblock-custom-lists', 'veil:adblock-add-list', 'veil:adblock-remove-list',
  // Phase 6: Password manager
  'veil:password-list', 'veil:password-get', 'veil:password-add', 'veil:password-update',
  'veil:password-delete', 'veil:password-unlock', 'veil:password-lock',
  // Phase 6: Proxy
  'veil:proxy-set-config',
];

function getTimeRangeMs(range: string): number {
  switch (range) {
    case 'hour': return 60 * 60 * 1000;
    case 'day': return 24 * 60 * 60 * 1000;
    case 'week': return 7 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

function cleanupIPC() {
  for (const channel of IPC_CHANNELS) {
    ipcMain.removeHandler(channel);
  }
}

function cleanupPreviousInstances() {
  if (currentTabService) { currentTabService.destroy(); currentTabService = null; }
  if (currentBookmarkService) { currentBookmarkService.destroy(); currentBookmarkService = null; }
  if (currentHistoryService) { currentHistoryService.destroy(); currentHistoryService = null; }
  if (currentSettingsService) { currentSettingsService.destroy(); currentSettingsService = null; }
  if (currentAdblock) { currentAdblock.destroy(); currentAdblock = null; }
  if (currentContextMenu) { currentContextMenu.destroy(); currentContextMenu = null; }
  if (currentExtension) { currentExtension.destroy(); currentExtension = null; }
  if (currentDownload) { currentDownload.destroy(); currentDownload = null; }
  if (currentFingerprint) { currentFingerprint.destroy(); currentFingerprint = null; }
  if (currentCookie) { currentCookie.destroy(); currentCookie = null; }
  if (currentHttps) { currentHttps.destroy(); currentHttps = null; }
  if (currentIncognito) { currentIncognito.destroy(); currentIncognito = null; }
  if (currentProxy) { currentProxy.destroy(); currentProxy = null; }
  if (currentPassword) { currentPassword.destroy(); currentPassword = null; }
  if (currentProfile) { currentProfile.destroy(); currentProfile = null; }
  if (currentMainWindow) {
    currentMainWindow.viewManager.cleanup();
    if (!currentMainWindow.window.isDestroyed()) currentMainWindow.window.close();
    currentMainWindow = null;
  }
  if (currentSessionAdapter) { currentSessionAdapter.destroy(); currentSessionAdapter = null; }
  if (currentPersistence) { currentPersistence.dispose(); currentPersistence = null; }
}

// Single-instance lock — prevent multiple browser instances from corrupting shared data
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// Custom SSL error page — block certificate errors by default
// Certificate error handler — integrated with CertificateExceptionService in initializeApp

// App lifecycle — all Electron-dependent initialization happens here
async function initializeApp() {
  if (appInitialized) {
    // Clean up previous IPC handlers and instances before re-registering
    cleanupIPC();
    cleanupPreviousInstances();
  }
  appInitialized = true;

  // Core infrastructure
  const eventBus = new EventBus();
  const errorHandler = new ErrorHandler(eventBus);
  const stateBroadcaster = new StateBroadcaster(errorHandler);
  const persistence = new PersistenceService(errorHandler);
  currentPersistence = persistence;
  const logger = new Logger('Main', eventBus);

  // Adapters
  const sessionAdapter = new ElectronSession();
  currentSessionAdapter = sessionAdapter;

  // Permission handler — block by default, allow common safe permissions
  const ALLOWED_PERMISSIONS = new Set(['clipboard-read', 'clipboard-sanitized-write']);
  sessionAdapter.setPermissionRequestHandler((permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });

  // Permission check handler — same allowlist for synchronous checks (A22)
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
    return ALLOWED_PERMISSIONS.has(permission);
  });

  // Security headers — applied to all HTTP responses
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };

    // Always add nosniff
    responseHeaders['X-Content-Type-Options'] = ['nosniff'];

    // Strict-origin referrer policy
    responseHeaders['Referrer-Policy'] = ['strict-origin-when-cross-origin'];

    // Permissions policy — disable sensitive APIs
    responseHeaders['Permissions-Policy'] = [
      'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    ];

    // X-Frame-Options — same-origin framing only, skip for app's own renderer pages
    const url = details.url;
    const isAppPage = url.startsWith('http://localhost:') || url.startsWith('file://');
    if (!isAppPage) {
      responseHeaders['X-Frame-Options'] = ['SAMEORIGIN'];
    }

    // Do NOT overwrite existing CSP or other security headers set by the page
    callback({ responseHeaders });
  });

  // Note: Referrer-Policy is set via the onHeadersReceived handler above.
  // The ElectronSession adapter already owns onBeforeSendHeaders, so we
  // rely on the response header for referrer policy enforcement.

  // Spell checker
  session.defaultSession.setSpellCheckerEnabled(true);
  session.defaultSession.setSpellCheckerLanguages(['en-US', 'ru']);

  // Repositories
  const tabRepo = new TabRepository(persistence);
  const bookmarkRepo = new BookmarkRepository(persistence);
  const historyRepo = new HistoryRepository(persistence);
  const downloadRepo = new DownloadRepository();
  const settingsRepo = new SettingsRepository(persistence);

  // Main window (creates BaseWindow — must be after app.whenReady())
  const mainWindow = new VeilWindow();
  currentMainWindow = mainWindow;
  const viewManagerAdapter = new ViewManagerAdapter(mainWindow.viewManager);

  // State broadcaster
  stateBroadcaster.setWebContents(mainWindow.getWebContents());

  // Services (dependency injection)
  const settingsService = new SettingsService(settingsRepo, eventBus, errorHandler, stateBroadcaster, logger);
  currentSettingsService = settingsService;
  const adblockService = new AdblockService(sessionAdapter, settingsService, stateBroadcaster, eventBus, errorHandler, logger);
  currentAdblock = adblockService;
  const tabService = new TabService(tabRepo, viewManagerAdapter, eventBus, errorHandler, stateBroadcaster, logger);
  currentTabService = tabService;
  const bookmarkService = new BookmarkService(bookmarkRepo, eventBus, errorHandler, stateBroadcaster, logger);
  currentBookmarkService = bookmarkService;
  const historyService = new HistoryService(historyRepo, eventBus, errorHandler, stateBroadcaster, logger);
  currentHistoryService = historyService;
  const downloadService = new DownloadService(sessionAdapter, downloadRepo, eventBus, errorHandler, stateBroadcaster, logger);
  currentDownload = downloadService;
  const contextMenuService = new ContextMenuService(
    mainWindow.window,
    tabService,
    settingsService,
    eventBus,
    errorHandler,
    logger
  );

  // Service Registry
  const registry = new ServiceRegistry(
    logger,
    errorHandler,
    stateBroadcaster,
    new ActionValidator(),
    new RateLimiter(),
    new ActionDispatcher(logger, errorHandler)
  );

  // IPC Handlers — close/minimize/maximize the window that sent the IPC (supports incognito)
  ipcMain.handle('veil:window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.minimize();
    return { success: true };
  });

  ipcMain.handle('veil:window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
    return { success: true };
  });

  ipcMain.handle('veil:window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.close();
    return { success: true };
  });

  ipcMain.handle('veil:open-debug', () => {
    if (!debugWindow) {
      debugWindow = new DebugWindow();
      debugWindow.create();
    }
    return { success: true };
  });

  ipcMain.handle('veil:close-debug', () => {
    if (debugWindow) {
      debugWindow.close();
      debugWindow = null;
    }
    return { success: true };
  });

  ipcMain.handle('veil:set-shell-offset', (_event, offset: number) => {
    viewManagerAdapter.setShellOffset(offset);
    return { success: true };
  });

  ipcMain.handle('veil:set-view-mode', (_event, mode: string) => {
    if (mode === 'settings') {
      viewManagerAdapter.hideAllViews();
    } else if (mode === 'browser') {
      viewManagerAdapter.showAllViews();
    }
    return { success: true };
  });

  ipcMain.handle('veil:set-overlay-visible', (_event, visible: boolean) => {
    const activeId = tabService.getActiveTabId();
    if (!activeId) return { success: true };
    if (visible) {
      viewManagerAdapter.hideAllViews();
    } else {
      viewManagerAdapter.showAllViews();
    }
    return { success: true };
  });

  ipcMain.handle('veil:find-in-page', (_event, text: string, options?: { findNext?: boolean; forward?: boolean }) => {
    try {
      const activeId = tabService.getActiveTabId();
      if (!activeId) return { success: false };
      const view = mainWindow.viewManager.getView(activeId);
      if (!view) return { success: false };
      if (text) {
        view.webContents.findInPage(text, {
          findNext: options?.findNext ?? true,
          forward: options?.forward ?? true,
        });
      } else {
        view.webContents.stopFindInPage('clearSelection');
      }
      return { success: true };
    } catch (e) {
      logger.error('find-in-page failed', e);
      return { success: false };
    }
  });

  ipcMain.handle('veil:stop-find', () => {
    try {
      const activeId = tabService.getActiveTabId();
      if (!activeId) return { success: true };
      const view = mainWindow.viewManager.getView(activeId);
      if (view) view.webContents.stopFindInPage('clearSelection');
      return { success: true };
    } catch (e) {
      logger.error('stop-find failed', e);
      return { success: false };
    }
  });

  ipcMain.handle('veil:clear-cookies', async () => {
    try {
      await session.defaultSession.clearStorageData({ storages: ['cookies'] });
      return { success: true };
    } catch (e) {
      logger.error('clear-cookies failed', e);
      return { success: false };
    }
  });

  // Version info
  ipcMain.handle('veil:version', () => ({
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    v8Version: process.versions.v8,
    os: `${process.platform} ${process.arch}`,
    osVersion: os.release(),
  }));

  ipcMain.handle('veil:history-list', () => {
    try {
      const entries = historyService.searchHistory('', 1000);
      return { entries };
    } catch (e) {
      logger.error('history-list failed', e);
      return { entries: [] };
    }
  });

  ipcMain.handle('veil:history-clear', () => {
    try {
      historyService.clearHistory();
      return { success: true };
    } catch (e) {
      logger.error('history-clear failed', e);
      return { success: false };
    }
  });

  ipcMain.handle('veil:add-log', (_event, log: unknown) => {
    if (debugWindow) {
      debugWindow.addLog(log);
    }
    return { success: true };
  });

  ipcMain.handle('veil:search-suggestions', (_event, query: string) => {
    try {
      const historyResults = historyService.searchHistory(query);
      const bookmarkResults = bookmarkService.searchBookmarks(query);
      const bookmarks = new Set(bookmarkResults.map(b => b.url));
      const merged = [
        ...bookmarkResults.map(r => ({ ...r, source: 'bookmark' as const })),
        ...historyResults.filter(r => !bookmarks.has(r.url)).map(r => ({ ...r, source: 'history' as const })),
      ];
      return merged.slice(0, 10);
    } catch (e) {
      logger.error('search-suggestions failed', e);
      return [];
    }
  });

  // Keyboard shortcuts — register after all services are created
  const wc = mainWindow.getWebContents();

  // Register services with registry
  registry.register(tabService);
  registry.register(bookmarkService);
  registry.register(historyService);
  registry.register(downloadService);
  registry.register(settingsService);
  registry.register(adblockService);
  registry.register(contextMenuService);
  currentContextMenu = contextMenuService;

  // Load extensions
  const extService = new ExtensionService(sessionAdapter, mainWindow.window, logger);
  registry.register(extService);
  currentExtension = extService;

  // Fingerprint protection
  const fingerprintService = new FingerprintProtectionService(sessionAdapter, settingsService, eventBus, errorHandler, logger);
  registry.register(fingerprintService);
  currentFingerprint = fingerprintService;

  // Cookie management (blocks third-party cookies)
  const cookieService = new CookieService(sessionAdapter, settingsService, logger);
  registry.register(cookieService);
  currentCookie = cookieService;

  // HTTPS Everywhere (upgrades HTTP to HTTPS for known sites)
  const httpsService = new HttpsUpgradeService(sessionAdapter, settingsService, logger);
  registry.register(httpsService);
  currentHttps = httpsService;

  // Script blocking (NoScript-like per-site JS blocking)
  const scriptBlockService = new ScriptBlockService(sessionAdapter, eventBus, errorHandler, logger, stateBroadcaster);
  registry.register(scriptBlockService);

  // Certificate exceptions (allows bypassing SSL errors for specific certs)
  const certExceptionService = new CertificateExceptionService(settingsService, logger);

  // Wire certificate exceptions into the certificate-error handler
  app.on('certificate-error', (event, webContents, _url, _error, cert, callback) => {
    if (certExceptionService.isException(cert.fingerprint)) {
      event.preventDefault();
      callback(true);
      return;
    }
    // Block and show error page
    event.preventDefault();
    callback(false);
    const errorHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Security Error</title>
<style>
  body { font-family: system-ui, sans-serif; background: #1a1a2e; color: #e0e0e0; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .container { text-align: center; max-width: 500px; padding: 40px; }
  h1 { font-size: 24px; color: #ef4444; margin-bottom: 16px; }
  p { color: #a0a0b0; line-height: 1.6; margin-bottom: 24px; }
  .icon { font-size: 48px; margin-bottom: 16px; }
</style></head><body>
<div class="container">
  <div class="icon">&#128274;</div>
  <h1>Connection Not Secure</h1>
  <p>This site's security certificate is not trusted. Veil Browser blocked this connection to protect your privacy.</p>
  <p style="font-size:12px;color:#666;">If you trust this site, you can add an exception in Settings &gt; Privacy.</p>
</div></body></html>`;
    webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
  });

  // Incognito mode
  const incognitoService = new IncognitoService(eventBus, errorHandler, logger);
  currentIncognito = incognitoService;

  // Incognito IPC
  ipcMain.handle('veil:incognito-open', () => {
    incognitoService.openIncognitoWindow();
    return { success: true };
  });

  ipcMain.handle('veil:incognito-close', () => {
    incognitoService.closeIncognitoWindow();
    return { success: true };
  });

  // Phase 6: Proxy service
  const proxyService = new ProxyService(settingsRepo, eventBus, errorHandler, stateBroadcaster, logger);
  currentProxy = proxyService;

  ipcMain.handle('veil:proxy-set-config', async (_event, config: Record<string, unknown>) => {
    try {
      await proxyService.setConfig(config as unknown as import('@veil/shared').ProxySettings);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Phase 6: Password service
  const passwordService = new PasswordService(persistence, eventBus, errorHandler, logger, stateBroadcaster);
  currentPassword = passwordService;

  ipcMain.handle('veil:password-unlock', async (_event, masterPassword: string) => {
    try {
      const result = await passwordService.unlock(masterPassword);
      return { success: result, error: result ? undefined : 'Invalid master password' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:password-lock', () => {
    passwordService.lock();
    return { success: true };
  });

  ipcMain.handle('veil:password-list', () => {
    try {
      if (!passwordService.isUnlocked()) return { success: false, error: 'Vault is locked' };
      return { success: true, credentials: passwordService.list() };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:password-get', (_event, id: string) => {
    try {
      if (!passwordService.isUnlocked()) return { success: false, error: 'Vault is locked' };
      const credential = passwordService.getById(id);
      if (!credential) return { success: false, error: 'Credential not found' };
      return { success: true, credential };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:password-add', (_event, data: { url: string; username: string; password: string; title: string }) => {
    try {
      if (!passwordService.isUnlocked()) return { success: false, error: 'Vault is locked' };
      const credential = passwordService.add(data);
      if (!credential) return { success: false, error: 'Failed to add credential' };
      return { success: true, credential };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:password-update', (_event, id: string, updates: Record<string, string>) => {
    try {
      if (!passwordService.isUnlocked()) return { success: false, error: 'Vault is locked' };
      const result = passwordService.update(id, updates);
      return { success: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:password-delete', (_event, id: string) => {
    try {
      const result = passwordService.delete(id);
      return { success: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Phase 6: Profile service
  const profileService = new ProfileService(persistence, eventBus, errorHandler, logger, stateBroadcaster);
  currentProfile = profileService;

  ipcMain.handle('veil:profile-list', () => {
    try {
      return profileService.list();
    } catch {
      return [];
    }
  });

  ipcMain.handle('veil:profile-create', (_event, name: string) => {
    try {
      const profile = profileService.create(name);
      if (!profile) return { success: false, error: 'Failed to create profile' };
      return { success: true, profile };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:profile-switch', async (_event, id: string) => {
    try {
      const result = await profileService.switchTo(id);
      return { success: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:profile-delete', (_event, id: string) => {
    try {
      const result = profileService.delete(id);
      return { success: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Phase 6: Custom adblock lists IPC
  ipcMain.handle('veil:adblock-custom-lists', () => {
    try {
      return adblockService.getCustomLists();
    } catch {
      return [];
    }
  });

  ipcMain.handle('veil:adblock-add-list', async (_event, url: string) => {
    try {
      const result = await adblockService.addCustomList(url);
      // Persist in settings
      if (result) {
        const current = settingsService.getSettings();
        const lists = (current.privacy as Record<string, unknown>).customAdblockLists as string[] || [];
        if (!lists.includes(url)) {
          settingsService.handleAction({ type: 'SETTINGS_UPDATE', payload: { privacy: { ...current.privacy, customAdblockLists: [...lists, url] } } });
        }
      }
      return { success: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('veil:adblock-remove-list', async (_event, url: string) => {
    try {
      const result = await adblockService.removeCustomList(url);
      // Persist in settings
      if (result) {
        const current = settingsService.getSettings();
        const lists = ((current.privacy as Record<string, unknown>).customAdblockLists as string[] || []).filter(l => l !== url);
        settingsService.handleAction({ type: 'SETTINGS_UPDATE', payload: { privacy: { ...current.privacy, customAdblockLists: lists } } });
      }
      return { success: result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Load custom adblock lists from settings on startup
  await adblockService.loadCustomListsFromSettings();

  // Apply proxy settings on startup
  await proxyService.applyProxy();

  // Zoom level IPC
  ipcMain.handle('veil:set-zoom-level', (_event, level: number) => {
    const activeTabId = tabService.getActiveTabId();
    if (activeTabId) {
      const view = mainWindow.viewManager.getView(activeTabId);
      if (view) view.webContents.setZoomLevel(level);
    }
    return { success: true };
  });

  // Privacy stats IPC
  ipcMain.handle('veil:privacy-stats', () => {
    return {
      blockedAds: adblockService.getBlockedAdsCount(),
      blockedTrackers: adblockService.getBlockedTrackersCount(),
      httpsUpgrades: httpsService.getUpgradesCount(),
      cookiesBlocked: cookieService.getBlockedCount(),
      topBlockedDomains: adblockService.getTopBlockedDomains(),
    };
  });

  // Clear browsing data IPC
  ipcMain.handle('veil:clear-browsing-data', async (_event, options: { timeRange: string; clearHistory: boolean; clearCookies: boolean; clearCache: boolean }) => {
    try {
      if (options.clearHistory) {
        const since = options.timeRange === 'all' ? 0 : Date.now() - getTimeRangeMs(options.timeRange);
        historyService.clearSince(since);
      }
      if (options.clearCookies) {
        await sessionAdapter.clearAllCookies();
      }
      if (options.clearCache) {
        await sessionAdapter.clearCache();
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Cookie management IPC
  ipcMain.handle('veil:cookie-list', async (_event, domain?: string) => {
    try {
      const cookies = await sessionAdapter.getCookies(domain);
      return cookies;
    } catch {
      return [];
    }
  });

  ipcMain.handle('veil:cookie-delete', async (_event, name: string, domain: string) => {
    try {
      await sessionAdapter.removeCookie(name, domain);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Default browser IPC
  ipcMain.handle('veil:set-default-browser', () => {
    app.setAsDefaultProtocolClient('http');
    app.setAsDefaultProtocolClient('https');
    return { success: true };
  });

  // Save page IPC
  ipcMain.handle('veil:save-page', async () => {
    const activeTabId = tabService.getActiveTabId();
    if (!activeTabId) return { success: false, error: 'No active tab' };
    const view = mainWindow.viewManager.getView(activeTabId);
    if (!view) return { success: false, error: 'No view' };
    const result = await dialog.showSaveDialog(mainWindow.window, {
      defaultPath: `${view.webContents.getTitle() || 'page'}.html`,
      filters: [{ name: 'Web Page', extensions: ['html'] }],
    });
    if (!result.canceled && result.filePath) {
      await view.webContents.savePage(result.filePath, 'HTMLComplete');
      return { success: true };
    }
    return { success: false, error: 'Cancelled' };
  });

  // Reader mode IPC
  ipcMain.handle('veil:toggle-reader-mode', async () => {
    const activeTabId = tabService.getActiveTabId();
    if (!activeTabId) return { success: false, error: 'No active tab' };
    const view = mainWindow.viewManager.getView(activeTabId);
    if (!view) return { success: false, error: 'No view' };
    // Inject Readability script and extract content
    try {
      const result = await view.webContents.executeJavaScript(`
        (function() {
          if (window.__readerModeActive) {
            document.documentElement.innerHTML = window.__originalHTML;
            window.__readerModeActive = false;
            return { active: false };
          }
          window.__originalHTML = document.documentElement.innerHTML;
          const article = document.querySelector('article') || document.querySelector('main') || document.body;
          const text = article ? article.innerText : document.body.innerText;
          const title = document.title;
          window.__readerModeActive = true;
          document.documentElement.innerHTML = '<head><style>body{font-family:Georgia,serif;max-width:680px;margin:40px auto;padding:0 20px;line-height:1.8;color:#1a1a1a;background:#fafafa}h1{font-size:2em;margin-bottom:0.5em}p{margin-bottom:1em}img{max-width:100%}</style></head><body><h1>' + title + '</h1><div>' + text.split('\\n').map(p => p.trim() ? '<p>' + p + '</p>' : '').join('') + '</div></body>';
          return { active: true };
        })()
      `);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Keyboard shortcuts — register after all services are created
  wc.on('before-input-event', (_event, input) => {
    if (mainWindow.window.isDestroyed()) return;
    const ctrl = input.control || input.meta;
    if (input.type !== 'keyDown') return;

    if (ctrl && !input.shift && input.key === 't') {
      wc.send('veil:shortcut', 'new-tab');
    } else if (ctrl && !input.shift && input.key === 'w') {
      wc.send('veil:shortcut', 'close-tab');
    } else if (ctrl && !input.shift && input.key === 'r') {
      wc.send('veil:shortcut', 'reload');
    } else if (ctrl && !input.shift && input.key === 'f') {
      wc.send('veil:shortcut', 'find-in-page');
    } else if (ctrl && input.shift && input.key === 'I') {
      const activeTabId = tabService.getActiveTabId();
      if (activeTabId) {
        const view = mainWindow.viewManager.getView(activeTabId);
        if (view) view.webContents.openDevTools({ mode: 'detach' });
      } else {
        wc.openDevTools({ mode: 'detach' });
      }
    } else if (ctrl && input.shift && input.key === 'D') {
      wc.send('veil:shortcut', 'debug');
    } else if (ctrl && input.shift && input.key === 'N') {
      incognitoService.openIncognitoWindow();
    } else if (ctrl && !input.shift && input.key === 'p') {
      const activeTabId = tabService.getActiveTabId();
      if (activeTabId) {
        const view = mainWindow.viewManager.getView(activeTabId);
        if (view) view.webContents.print();
      }
    } else if (ctrl && !input.shift && (input.key === '=' || input.key === '+')) {
      const activeTabId = tabService.getActiveTabId();
      if (activeTabId) {
        const view = mainWindow.viewManager.getView(activeTabId);
        if (view) {
          const newLevel = view.webContents.getZoomLevel() + 0.5;
          view.webContents.setZoomLevel(newLevel);
          wc.send('veil:zoom-change', newLevel);
        }
      }
    } else if (ctrl && !input.shift && input.key === '-') {
      const activeTabId = tabService.getActiveTabId();
      if (activeTabId) {
        const view = mainWindow.viewManager.getView(activeTabId);
        if (view) {
          const newLevel = view.webContents.getZoomLevel() - 0.5;
          view.webContents.setZoomLevel(newLevel);
          wc.send('veil:zoom-change', newLevel);
        }
      }
    } else if (ctrl && !input.shift && input.key === '0') {
      const activeTabId = tabService.getActiveTabId();
      if (activeTabId) {
        const view = mainWindow.viewManager.getView(activeTabId);
        if (view) {
          view.webContents.setZoomLevel(0);
          wc.send('veil:zoom-change', 0);
        }
      }
    } else if (ctrl && !input.shift && input.key === 'Tab') {
      wc.send('veil:shortcut', 'next-tab');
    } else if (ctrl && input.shift && input.key === 'Tab') {
      wc.send('veil:shortcut', 'prev-tab');
    } else if (ctrl && input.shift && input.key === 't') {
      wc.send('veil:shortcut', 'restore-tab');
    } else if (ctrl && !input.shift && input.key === 'd') {
      wc.send('veil:shortcut', 'bookmark');
    } else if (ctrl && !input.shift && input.key === 'l') {
      wc.send('veil:shortcut', 'focus-address-bar');
    } else if (ctrl && !input.shift && input.key === 'h') {
      wc.send('veil:shortcut', 'history');
    } else if (ctrl && !input.shift && input.key === 'j') {
      wc.send('veil:shortcut', 'downloads');
    } else if (input.key === 'F5') {
      const activeTabId = tabService.getActiveTabId();
      if (activeTabId) {
        const view = mainWindow.viewManager.getView(activeTabId);
        if (view) view.webContents.reload();
      }
    } else if (!ctrl && !input.shift && input.key === 'Escape') {
      const activeTabId = tabService.getActiveTabId();
      if (activeTabId) {
        const view = mainWindow.viewManager.getView(activeTabId);
        if (view) view.webContents.stop();
      }
    } else if (input.key === 'F11') {
      mainWindow.window.setFullScreen(!mainWindow.window.isFullScreen());
      wc.send('veil:fullscreen-change', mainWindow.window.isFullScreen());
    } else if (ctrl && !input.shift && input.key === 's') {
      const activeTabId = tabService.getActiveTabId();
      if (activeTabId) {
        const view = mainWindow.viewManager.getView(activeTabId);
        if (view) {
                dialog.showSaveDialog(mainWindow.window, {
            defaultPath: `${view.webContents.getTitle() || 'page'}.html`,
            filters: [{ name: 'Web Page', extensions: ['html'] }],
          }).then((result: Electron.SaveDialogReturnValue) => {
            if (!result.canceled && result.filePath) {
              view.webContents.savePage(result.filePath, 'HTMLComplete').catch(() => {});
            }
          });
        }
      }
    } else if (ctrl && !input.shift && input.key === 'b') {
      const activeTabId = tabService.getActiveTabId();
      if (activeTabId) {
        tabService.handleAction({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url: 'veil://bookmarks' } });
      }
    } else if (ctrl && input.shift && input.key === 'A') {
      wc.send('veil:shortcut', 'tab-search');
    } else if (ctrl && !input.shift && input.key === '/') {
      const activeTabId = tabService.getActiveTabId();
      if (activeTabId) {
        tabService.handleAction({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url: 'veil://shortcuts' } });
      }
    }
  });

  // Initialize all services (sets up veil:action and veil:get-state IPC handlers)
  await registry.initAll();

  // Restore tabs on launch if setting is enabled
  const settings = settingsService.getSettings();
  if (settings.general.restoreTabsOnLaunch) {
    const { tabs: savedTabs, activeTabId, pinnedIds, mutedIds, tabGroups: savedTabGroups } = tabRepo.restoreTabs();
    if (savedTabs.length > 0) {
      tabService.restoreTabs(savedTabs, activeTabId, pinnedIds, mutedIds, savedTabGroups);
      // Register tab URLs with history service for title tracking
      for (const tab of savedTabs) {
        historyService.registerTabUrl(tab.id, tab.url);
      }
      logger.info(`Restored ${savedTabs.length} tabs from previous session`);
    }
  }

  // Load renderer
  const rendererUrl = ConfigManager.getInstance().getRendererUrl();
  mainWindow.loadApp(rendererUrl);

  logger.info('Veil Browser initialized');
}

app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  PersistenceService.flushAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    initializeApp();
  }
});

app.on('before-quit', () => {
  PersistenceService.flushAll();
});
