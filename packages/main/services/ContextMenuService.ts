import { Menu, MenuItem, BaseWindow, clipboard, app } from 'electron';
import { VeilService } from '../core/ServiceRegistry';
import { VeilAction, SearchEngine, getSearchUrl } from '@veil/shared';
import { Logger } from '../core/Logger';

interface TabServiceLike {
  handleAction(action: VeilAction): void | Promise<void>;
}

interface SettingsServiceLike {
  getSettings(): { general: { searchEngine: SearchEngine; customSearchUrl: string } };
}

export class ContextMenuService implements VeilService {
  public name = 'ContextMenuService';
  private logger: Logger;

  constructor(
    private window: BaseWindow,
    private tabService: TabServiceLike,
    private settingsService: SettingsServiceLike
  ) {
    this.logger = new Logger('ContextMenuService');
  }

  public async init() {
    // Auto-register context menu on all new webContents (tabs, etc.)
    app.on('web-contents-created', (_, webContents) => {
      this.registerTabContextMenu(webContents);
    });
    this.logger.info('ContextMenuService initialized');
  }

  public registerTabContextMenu(webContents: Electron.WebContents) {
    webContents.on('context-menu', (event, params) => {
      this.showContextMenu(params, webContents);
    });
  }

  private showContextMenu(params: Electron.ContextMenuParams, tabWebContents: Electron.WebContents) {
    const menu = new Menu();

    // Link context
    if (params.linkURL) {
      menu.append(new MenuItem({
        label: 'Open link in new tab',
        click: () => this.tabService.handleAction({ type: 'TAB_NEW', payload: { url: params.linkURL } }),
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
        click: () => tabWebContents.downloadURL(params.srcURL),
      }));
      menu.append(new MenuItem({
        label: 'Copy image URL',
        click: () => clipboard.writeText(params.srcURL),
      }));
      menu.append(new MenuItem({
        label: 'Open image in new tab',
        click: () => this.tabService.handleAction({ type: 'TAB_NEW', payload: { url: params.srcURL } }),
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
      click: () => {
        const url = tabWebContents.getURL();
        this.tabService.handleAction({ type: 'TAB_NEW', payload: { url: `view-source:${url}` } });
      },
    }));
    menu.append(new MenuItem({
      label: 'Inspect Element',
      accelerator: 'CmdOrCtrl+Shift+I',
      click: () => tabWebContents.inspectElement(params.x, params.y),
    }));

    menu.popup({ window: this.window });
  }

  public async handleAction(_action: VeilAction) {}
}
