import { VeilAction, TabInfo } from '@veil/shared';
import { ViewManager } from '../../core/ViewManager';
import { EventTypes } from '../../core/EventBus';
import { ErrorSeverity } from '../../core/ErrorHandler';
import { IEventBus, IErrorHandler, IStateBroadcaster, ILogger } from '../../core/interfaces';
import { BaseService } from '../../core/BaseService';
import { randomUUID } from 'crypto';

export class NewTabService extends BaseService {
  public name = 'TabService';
  private tabs: TabInfo[] = [];
  private activeTabId: string | null = null;

  constructor(
    private viewManager: ViewManager,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    private stateBroadcaster: IStateBroadcaster,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger);
  }

  public async init() {
    this.logger.info('TabService initialized');
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for navigation events from other services
    this.eventBus.on(EventTypes.TAB_NAVIGATED, (data: { id: string; url: string; title?: string }) => {
      this.logger.debug(`Tab navigated: ${data.id} -> ${data.url}`);
    });
  }

  private broadcastState() {
    this.stateBroadcaster.patch({
      tabs: this.tabs,
      activeTabId: this.activeTabId,
    });
  }

  private getHomepage(): string {
    return this.stateBroadcaster.getState().settings.general.homepage;
  }

  public getActiveTabId(): string | null {
    return this.activeTabId;
  }

  public async handleAction(action: VeilAction) {
    this.logger.debug(`Handling action: ${action.type}`);

    switch (action.type) {
      case 'TAB_NEW': {
        const url = action.payload?.url || this.getHomepage();
        const id = randomUUID();
        const newTab: TabInfo = {
          id,
          url,
          title: 'Loading...',
          isLoading: true,
          canGoBack: false,
          canGoForward: false,
          loadProgress: 0,
        };
        this.tabs.push(newTab);
        this.activeTabId = id;
        try {
          this.viewManager.createView(id, url);
          this.registerViewListeners(id);
        } catch (error) {
          this.errorHandler.handle(
            'TAB_VIEW_CREATE_FAILED',
            String(error),
            ErrorSeverity.HIGH,
            'TabService'
          );
        }
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_CREATED, newTab);
        break;
      }

      case 'TAB_CLOSE': {
        const { id } = action.payload;
        const index = this.tabs.findIndex(t => t.id === id);
        if (index === -1) break;
        this.tabs.splice(index, 1);
        try {
          this.viewManager.closeView(id);
        } catch (error) {
          this.errorHandler.handle(
            'TAB_VIEW_CLOSE_FAILED',
            String(error),
            ErrorSeverity.MEDIUM,
            'TabService'
          );
        }
        if (this.activeTabId === id) {
          this.activeTabId = this.tabs.length > 0 ? this.tabs[Math.max(0, index - 1)].id : null;
          if (this.activeTabId) {
            this.viewManager.focusView(this.activeTabId);
          }
        }
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_CLOSED, { id });
        break;
      }

      case 'TAB_FOCUS': {
        const { id } = action.payload;
        const tab = this.tabs.find(t => t.id === id);
        if (!tab) break;
        this.activeTabId = id;
        this.viewManager.hideAllViews();
        this.viewManager.focusView(id);
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_FOCUSED, { id });
        break;
      }

      case 'TAB_NAVIGATE': {
        const { id, url } = action.payload;
        const targetTab = this.tabs.find(t => t.id === id);
        if (!targetTab) break;
        targetTab.url = url;
        targetTab.isLoading = true;
        targetTab.loadProgress = 0;
        const view = this.viewManager.getView(id);
        if (view) {
          view.webContents.loadURL(url).catch((error) => {
            this.errorHandler.handle(
              'TAB_NAVIGATE_FAILED',
              `Failed to navigate to ${url} in tab ${id}: ${error}`,
              ErrorSeverity.MEDIUM,
              'TabService'
            );
          });
        }
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_NAVIGATED, { id, url });
        break;
      }

      case 'TAB_GO_BACK': {
        const { id } = action.payload;
        const view = this.viewManager.getView(id);
        if (view && view.webContents.canGoBack()) {
          view.webContents.goBack();
        }
        break;
      }

      case 'TAB_GO_FORWARD': {
        const { id } = action.payload;
        const view = this.viewManager.getView(id);
        if (view && view.webContents.canGoForward()) {
          view.webContents.goForward();
        }
        break;
      }

      case 'TAB_RELOAD': {
        const { id } = action.payload;
        const view = this.viewManager.getView(id);
        if (view) {
          view.webContents.reload();
        }
        break;
      }

      case 'TAB_GO_HOME': {
        const { id } = action.payload;
        const tab = this.tabs.find(t => t.id === id);
        if (!tab) break;
        const homepage = this.getHomepage();
        tab.url = homepage;
        tab.isLoading = true;
        tab.loadProgress = 0;
        const view = this.viewManager.getView(id);
        if (view) {
          view.webContents.loadURL(homepage).catch((error) => {
            this.errorHandler.handle(
              'TAB_HOME_FAILED',
              String(error),
              ErrorSeverity.MEDIUM,
              'TabService'
            );
          });
        }
        this.broadcastState();
        break;
      }
    }
  }

  private registerViewListeners(tabId: string) {
    const view = this.viewManager.getView(tabId);
    if (!view) return;

    view.webContents.on('page-title-updated', (_event, title) => {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) {
        tab.title = title;
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_TITLE_CHANGED, { id: tabId, title });
      }
    });

    view.webContents.on('page-favicon-updated', (_event, favicons) => {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab && favicons.length > 0) {
        tab.favicon = favicons[0];
        this.broadcastState();
      }
    });

    view.webContents.on('did-start-loading', () => {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) {
        tab.isLoading = true;
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_LOADING, { id: tabId, isLoading: true });
      }
    });

    view.webContents.on('did-stop-loading', () => {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) {
        tab.isLoading = false;
        tab.loadProgress = 100;
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_LOADING, { id: tabId, isLoading: false });
      }
    });

    view.webContents.on('did-navigate', (_event, url) => {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) {
        tab.url = url;
        tab.canGoBack = view.webContents.canGoBack();
        tab.canGoForward = view.webContents.canGoForward();
        this.broadcastState();
      }
    });

    view.webContents.on('did-navigate-in-page', (_event, url) => {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) {
        tab.url = url;
        tab.canGoBack = view.webContents.canGoBack();
        tab.canGoForward = view.webContents.canGoForward();
        this.broadcastState();
      }
    });

    view.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });
  }
}
