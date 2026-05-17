import { VeilAction, Tab } from '@veil/shared';
import { ViewManager } from '../../core/ViewManager';
import { EventTypes } from '../../core/EventBus';
import { ErrorSeverity } from '../../core/ErrorHandler';
import { IEventBus, IErrorHandler, IStateBroadcaster, ILogger } from '../../core/interfaces';
import { ITabRepository } from '../../core/repositories/ITabRepository';
import { BaseService } from '../../core/BaseService';

export class NewTabService extends BaseService {
  public name = 'TabService';

  constructor(
    private tabRepo: ITabRepository,
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
    this.eventBus.on(EventTypes.TAB_NAVIGATED, (data: { id: string; url: string; title?: string }) => {
      this.logger.debug(`Tab navigated: ${data.id} -> ${data.url}`);
    });
  }

  private broadcastState() {
    this.stateBroadcaster.patch({
      tabs: this.tabRepo.getAll().map(t => t.toJSON()),
      activeTabId: this.tabRepo.getActiveTabId(),
    });
  }

  private getHomepage(): string {
    return this.stateBroadcaster.getState().settings.general.homepage;
  }

  public getActiveTabId(): string | null {
    return this.tabRepo.getActiveTabId();
  }

  public async handleAction(action: VeilAction) {
    this.logger.debug(`Handling action: ${action.type}`);

    switch (action.type) {
      case 'TAB_NEW': {
        const url = action.payload?.url || this.getHomepage();
        const tab = Tab.create(url);
        this.tabRepo.add(tab);
        this.tabRepo.setActiveTabId(tab.id);
        try {
          this.viewManager.createView(tab.id, tab.url);
          this.registerViewListeners(tab.id);
        } catch (error) {
          this.errorHandler.handle(
            'TAB_VIEW_CREATE_FAILED',
            String(error),
            ErrorSeverity.HIGH,
            'TabService'
          );
        }
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_CREATED, tab.toJSON());
        break;
      }

      case 'TAB_CLOSE': {
        const { id } = action.payload;
        const tab = this.tabRepo.getById(id);
        if (!tab) break;
        const allTabs = this.tabRepo.getAll();
        const index = allTabs.findIndex(t => t.id === id);
        this.tabRepo.remove(id);
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
        if (this.tabRepo.getActiveTabId() === id) {
          const remaining = this.tabRepo.getAll();
          const newActiveId = remaining.length > 0 ? remaining[Math.max(0, index - 1)].id : null;
          this.tabRepo.setActiveTabId(newActiveId);
          if (newActiveId) {
            this.viewManager.focusView(newActiveId);
          }
        }
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_CLOSED, { id });
        break;
      }

      case 'TAB_FOCUS': {
        const { id } = action.payload;
        const tab = this.tabRepo.getById(id);
        if (!tab) break;
        this.tabRepo.setActiveTabId(id);
        this.viewManager.hideAllViews();
        this.viewManager.focusView(id);
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_FOCUSED, { id });
        break;
      }

      case 'TAB_NAVIGATE': {
        const { id, url } = action.payload;
        const tab = this.tabRepo.getById(id);
        if (!tab) break;
        tab.navigate(url);
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
        const tab = this.tabRepo.getById(id);
        if (!tab) break;
        const homepage = this.getHomepage();
        tab.navigate(homepage);
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
      const tab = this.tabRepo.getById(tabId);
      if (tab) {
        tab.updateTitle(title);
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_TITLE_CHANGED, { id: tabId, title });
      }
    });

    view.webContents.on('page-favicon-updated', (_event, favicons) => {
      const tab = this.tabRepo.getById(tabId);
      if (tab && favicons.length > 0) {
        tab.updateFavicon(favicons[0]);
        this.broadcastState();
      }
    });

    view.webContents.on('did-start-loading', () => {
      const tab = this.tabRepo.getById(tabId);
      if (tab) {
        tab.startLoading();
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_LOADING, { id: tabId, isLoading: true });
      }
    });

    view.webContents.on('did-stop-loading', () => {
      const tab = this.tabRepo.getById(tabId);
      if (tab) {
        tab.stopLoading();
        this.broadcastState();
        this.eventBus.emit(EventTypes.TAB_LOADING, { id: tabId, isLoading: false });
      }
    });

    view.webContents.on('did-navigate', (_event, url) => {
      const tab = this.tabRepo.getById(tabId);
      if (tab) {
        tab.url = url;
        tab.updateNavigationState(view.webContents.canGoBack(), view.webContents.canGoForward());
        this.broadcastState();
      }
    });

    view.webContents.on('did-navigate-in-page', (_event, url) => {
      const tab = this.tabRepo.getById(tabId);
      if (tab) {
        tab.url = url;
        tab.updateNavigationState(view.webContents.canGoBack(), view.webContents.canGoForward());
        this.broadcastState();
      }
    });

    view.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });
  }
}
