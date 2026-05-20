import { Menu, MenuItem, BaseWindow, clipboard, app } from 'electron';
import { VeilAction, SearchEngine, getSearchUrl } from '@veil/shared';
import { IEventBus, IErrorHandler, ILogger } from '../core/interfaces';
import { BaseService } from '../core/BaseService';

interface TabServiceLike {
  handleAction(action: VeilAction): void | Promise<void>;
}

interface SettingsServiceLike {
  getSettings(): { general: { searchEngine: SearchEngine; customSearchUrl: string } };
}

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'veil:']);

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SAFE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export class ContextMenuService extends BaseService {
  public name = 'ContextMenuService';
  private webContentsHandler: ((event: Electron.Event, webContents: Electron.WebContents) => void) | null = null;
  private contextMenuCleanups: Map<number, () => void> = new Map();

  constructor(
    private window: BaseWindow,
    private tabService: TabServiceLike,
    private settingsService: SettingsServiceLike,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger);
  }

  public async init() {
    // Only register context menu on webContents that are not the shell renderer
    // (shell webContents should show OS default menu or nothing)
    this.webContentsHandler = (_, webContents) => {
      // Skip the shell window's own webContents — only register on tab views
      const url = webContents.getURL();
      const isRendererShell = url.startsWith('http://localhost') || url.startsWith('file://') || url.includes('veil://');
      if (!isRendererShell && webContents.getType() !== 'window') {
        this.registerTabContextMenu(webContents);
      }
    };
    app.on('web-contents-created', this.webContentsHandler);
    this.logger.info('ContextMenuService initialized');
  }

  /**
   * Register context menu on a specific tab webContents (called from TabService).
   */
  public registerForTab(webContents: Electron.WebContents): void {
    this.registerTabContextMenu(webContents);
  }

  public destroy(): void {
    if (this.webContentsHandler) {
      app.removeListener('web-contents-created', this.webContentsHandler);
      this.webContentsHandler = null;
    }
    // Clean up per-webContents listeners
    for (const cleanup of this.contextMenuCleanups.values()) {
      cleanup();
    }
    this.contextMenuCleanups.clear();
  }

  public registerTabContextMenu(webContents: Electron.WebContents) {
    const handler = (_event: Electron.Event, params: Electron.ContextMenuParams) => {
      this.showContextMenu(params, webContents);
    };
    webContents.on('context-menu', handler);
    // Track cleanup for this webContents
    this.contextMenuCleanups.set(webContents.id, () => {
      webContents.removeListener('context-menu', handler);
    });
    // Remove tracking when webContents is destroyed
    webContents.on('destroyed', () => {
      this.contextMenuCleanups.delete(webContents.id);
    });
  }

  private showContextMenu(params: Electron.ContextMenuParams, tabWebContents: Electron.WebContents) {
    const menu = new Menu();

    // Link context
    if (params.linkURL) {
      menu.append(new MenuItem({
        label: 'Open link in new tab',
        click: () => {
          if (isSafeUrl(params.linkURL)) {
            this.tabService.handleAction({ type: 'TAB_NEW', payload: { url: params.linkURL } });
          }
        },
      }));
      menu.append(new MenuItem({
        label: 'Copy link address',
        click: () => clipboard.writeText(params.linkURL),
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Image context
    if (params.mediaType === 'image') {
      menu.append(new MenuItem({
        label: 'Save image as...',
        enabled: isSafeUrl(params.srcURL),
        click: () => {
          if (isSafeUrl(params.srcURL)) {
            tabWebContents.downloadURL(params.srcURL);
          }
        },
      }));
      menu.append(new MenuItem({
        label: 'Copy image URL',
        click: () => clipboard.writeText(params.srcURL),
      }));
      menu.append(new MenuItem({
        label: 'Open image in new tab',
        click: () => {
          if (isSafeUrl(params.srcURL)) {
            this.tabService.handleAction({ type: 'TAB_NEW', payload: { url: params.srcURL } });
          }
        },
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Selected text
    if (params.selectionText) {
      menu.append(new MenuItem({
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        click: () => clipboard.writeText(params.selectionText),
      }));
      const settings = this.settingsService.getSettings();
      const searchUrl = getSearchUrl(params.selectionText, settings.general.searchEngine, settings.general.customSearchUrl);
      menu.append(new MenuItem({
        label: `Search for "${params.selectionText.slice(0, 30)}${params.selectionText.length > 30 ? '...' : ''}"`,
        click: () => this.tabService.handleAction({
          type: 'TAB_NEW',
          payload: { url: searchUrl }
        }),
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    // Tab navigation
    menu.append(new MenuItem({
      label: 'Back',
      enabled: tabWebContents.canGoBack(),
      click: () => tabWebContents.goBack(),
    }));
    menu.append(new MenuItem({
      label: 'Forward',
      enabled: tabWebContents.canGoForward(),
      click: () => tabWebContents.goForward(),
    }));
    menu.append(new MenuItem({
      label: 'Reload',
      accelerator: 'CmdOrCtrl+R',
      click: () => tabWebContents.reload(),
    }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({
      label: 'View page source',
      accelerator: 'CmdOrCtrl+U',
      enabled: isSafeUrl(tabWebContents.getURL()),
      click: () => {
        const url = tabWebContents.getURL();
        if (isSafeUrl(url)) {
          this.tabService.handleAction({ type: 'TAB_NEW', payload: { url: `view-source:${url}` } });
        }
      },
    }));
    menu.append(new MenuItem({
      label: 'Inspect Element',
      accelerator: 'CmdOrCtrl+Shift+I',
      click: () => tabWebContents.inspectElement(params.x, params.y),
    }));

    menu.popup({ window: this.window });
  }
}
