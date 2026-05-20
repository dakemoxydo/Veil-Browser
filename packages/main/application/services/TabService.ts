import { Tab, TabInfo, TabGroup, VeilAction } from '@veil/shared';
import { EventTypes } from '../../core/EventBus';
import { ErrorSeverity } from '../../core/ErrorHandler';
import { IEventBus, IErrorHandler, IStateBroadcaster, ILogger } from '../../core/interfaces';
import { ITabRepository } from '../../core/repositories/ITabRepository';
import { ITabViewProvider } from '../../core/ports/ITabViewProvider';
import { BaseService } from '../../core/BaseService';
import { CreateTabUseCase } from '../usecases/CreateTabUseCase';
import { CloseTabUseCase } from '../usecases/CloseTabUseCase';
import { FocusTabUseCase } from '../usecases/FocusTabUseCase';
import { NavigateTabUseCase } from '../usecases/NavigateTabUseCase';

export class TabService extends BaseService {
  public name = 'TabService';

  private createTab: CreateTabUseCase;
  private closeTab: CloseTabUseCase;
  private focusTab: FocusTabUseCase;
  private navigateTab: NavigateTabUseCase;
  private registeredListeners: Set<string> = new Set();
  private listenerCleanups: Array<() => void> = [];
  private recentlyClosed: TabInfo[] = [];
  private pinnedTabs: Set<string> = new Set();
  private mutedTabs: Set<string> = new Set();
  private tabGroups: TabGroup[] = [];
  private static readonly MAX_MATERIALIZED_TABS = 5;
  private static readonly MAX_RECENTLY_CLOSED = 25;

  constructor(
    private tabRepo: ITabRepository,
    private viewProvider: ITabViewProvider,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    stateBroadcaster: IStateBroadcaster,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger, stateBroadcaster);
    this.createTab = new CreateTabUseCase(tabRepo, viewProvider);
    this.closeTab = new CloseTabUseCase(tabRepo, viewProvider);
    this.focusTab = new FocusTabUseCase(tabRepo, viewProvider);
    this.navigateTab = new NavigateTabUseCase(tabRepo, viewProvider);
  }

  public async init() {
    this.logger.info('TabService initialized');
    this.setupEventListeners();
  }

  /**
   * Restores saved tabs without creating new ones via action dispatch.
   * Materializes up to MAX_MATERIALIZED_TABS views immediately; the rest are deferred.
   */
  public restoreTabs(savedTabs: TabInfo[], activeTabId: string | null, pinnedIds: string[] = [], mutedIds: string[] = [], savedTabGroups: TabGroup[] = []): void {
    let materialized = 0;

    for (const tabInfo of savedTabs) {
      const tab = Tab.fromJSON(tabInfo);
      this.tabRepo.add(tab);

      if (materialized < TabService.MAX_MATERIALIZED_TABS) {
        this.viewProvider.createView(tab.id, tab.url);
        this.registerViewListeners(tab.id);
        materialized++;
      } else {
        // Defer view creation for memory efficiency
        this.viewProvider.createView(tab.id, tab.url, true, () => {
          this.registerViewListeners(tab.id);
        });
      }
    }

    // Restore active tab
    const targetId = activeTabId && this.tabRepo.getById(activeTabId)
      ? activeTabId
      : savedTabs.length > 0 ? savedTabs[0].id : null;

    if (targetId) {
      this.tabRepo.setActiveTabId(targetId);
      this.viewProvider.hideAllViews();
      this.viewProvider.focusView(targetId);
    }

    // Restore persisted UI state (A4)
    for (const id of pinnedIds) {
      if (this.tabRepo.getById(id)) this.pinnedTabs.add(id);
    }
    for (const id of mutedIds) {
      if (this.tabRepo.getById(id)) {
        this.mutedTabs.add(id);
        this.viewProvider.setAudioMuted(id, true);
      }
    }
    this.tabGroups = savedTabGroups;

    this.broadcastState();
  }

  private setupEventListeners(): void {
    this.listenerCleanups.push(
      this.eventBus.on(EventTypes.TAB_NAVIGATED, (data: { id: string; url: string; title?: string }) => {
        this.logger.debug(`Tab navigated: ${data.id} -> ${data.url}`);
      }),
    );
  }

  public destroy(): void {
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    this.listenerCleanups.forEach(fn => fn());
    this.listenerCleanups = [];
  }

  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;

  private broadcastState() {
    if (this.broadcastTimer) return;
    this.broadcastTimer = setTimeout(() => {
      this.broadcastTimer = null;
      this.broadcast({
        tabs: this.tabRepo.getAll().map(t => {
          const info = t.toJSON();
          if (this.pinnedTabs.has(info.id)) info.pinned = true;
          if (this.mutedTabs.has(info.id)) info.muted = true;
          return info;
        }),
        activeTabId: this.tabRepo.getActiveTabId(),
        recentlyClosed: this.recentlyClosed,
        tabGroups: this.tabGroups,
      });
    }, 50);
  }

  private getHomepage(): string {
    return this.stateBroadcaster!.getState().settings.general.homepage;
  }

  private static SAFE_PROTOCOLS = new Set(['http:', 'https:', 'veil:']);

  /** Allowed veil:// internal pages — block anything else to prevent injection */
  private static ALLOWED_VEIL_PATHS = new Set([
    'veil://home', 'veil://history', 'veil://version',
    'veil://bookmarks', 'veil://downloads', 'veil://privacy',
    'veil://shortcuts', 'veil://settings', 'veil://cookies',
    'veil://permissions', 'veil://certificates', 'veil://passwords',
  ]);

  private isSafeUrl(url: string): boolean {
    try {
      // Handle view-source: prefix — check the underlying URL
      const stripped = url.startsWith('view-source:') ? url.slice('view-source:'.length) : url;
      const parsed = new URL(stripped);
      return TabService.SAFE_PROTOCOLS.has(parsed.protocol);
    } catch {
      return false;
    }
  }

  private isValidVeilUrl(url: string): boolean {
    // Exact match or prefix match with /
    for (const allowed of TabService.ALLOWED_VEIL_PATHS) {
      if (url === allowed || url.startsWith(allowed + '/') || url.startsWith(allowed + '?')) {
        return true;
      }
    }
    return false;
  }

  public getActiveTabId(): string | null {
    return this.tabRepo.getActiveTabId();
  }

  public async handleAction(action: VeilAction) {
    this.logger.debug(`Handling action: ${action.type}`);

    switch (action.type) {
      case 'TAB_NEW': {
        const rawUrl = action.payload?.url || 'veil://home';
        let url: string;
        if (rawUrl.startsWith('veil://')) {
          url = this.isValidVeilUrl(rawUrl) ? rawUrl : 'veil://home';
        } else {
          url = this.isSafeUrl(rawUrl) ? rawUrl : this.getHomepage();
        }
        try {
          const tab = this.createTab.execute(url);
          this.registerViewListeners(tab.id);
          this.broadcastState();
          this.eventBus.emit(EventTypes.TAB_CREATED, tab.toJSON());
        } catch (error) {
          this.errorHandler.handle('TAB_VIEW_CREATE_FAILED', String(error), ErrorSeverity.HIGH, 'TabService');
        }
        break;
      }

      case 'TAB_CLOSE': {
        const id = action.payload?.id;
        if (!id) return;
        try {
          // Track closed tab for restore
          const closedTab = this.tabRepo.getById(id);
          if (closedTab) {
            this.recentlyClosed.unshift(closedTab.toJSON());
            if (this.recentlyClosed.length > TabService.MAX_RECENTLY_CLOSED) {
              this.recentlyClosed.pop();
            }
          }
          this.closeTab.execute(id);
          this.registeredListeners.delete(id);
          this.broadcastState();
          this.eventBus.emit(EventTypes.TAB_CLOSED, { id });
        } catch (error) {
          this.errorHandler.handle('TAB_VIEW_CLOSE_FAILED', String(error), ErrorSeverity.MEDIUM, 'TabService');
        }
        break;
      }

      case 'TAB_RESTORE': {
        const last = this.recentlyClosed.shift();
        if (!last) return;
        try {
          const tab = this.createTab.execute(last.url);
          if (last.title) tab.updateTitle(last.title);
          this.registerViewListeners(tab.id);
          this.broadcastState();
          this.eventBus.emit(EventTypes.TAB_CREATED, tab.toJSON());
        } catch (error) {
          this.errorHandler.handle('TAB_RESTORE_FAILED', String(error), ErrorSeverity.LOW, 'TabService');
        }
        break;
      }

      case 'TAB_REORDER': {
        if (!action.payload) return;
        const { sourceId, targetId } = action.payload;
        if (!sourceId || !targetId || sourceId === targetId) return;
        const tabs = this.tabRepo.getAll();
        const sourceIdx = tabs.findIndex(t => t.id === sourceId);
        const targetIdx = tabs.findIndex(t => t.id === targetId);
        if (sourceIdx === -1 || targetIdx === -1) return;
        this.tabRepo.reorder(sourceIdx, targetIdx);
        this.broadcastState();
        break;
      }

      case 'TAB_FOCUS': {
        const id = action.payload?.id;
        if (!id) return;
        if (this.focusTab.execute(id)) {
          // Register listeners if not yet registered (deferred views materialized on focus)
          if (!this.registeredListeners.has(id)) {
            this.registerViewListeners(id);
          }
          this.broadcastState();
          this.eventBus.emit(EventTypes.TAB_FOCUSED, { id });
        }
        break;
      }

      case 'TAB_NAVIGATE': {
        const id = action.payload?.id;
        const url = action.payload?.url;
        if (!id || !url) return;
        // Validate URL — veil:// must be in allowlist, external must use safe protocol
        if (url.startsWith('veil://')) {
          if (!this.isValidVeilUrl(url)) return;
        } else if (!this.isSafeUrl(url)) {
          return;
        }
        if (this.navigateTab.execute(id, url)) {
          this.broadcastState();
          this.eventBus.emit(EventTypes.TAB_NAVIGATED, { id, url });
        }
        break;
      }

      case 'TAB_GO_BACK': {
        const id = action.payload?.id;
        if (!id) return;
        this.viewProvider.goBack(id);
        break;
      }

      case 'TAB_GO_FORWARD': {
        const id = action.payload?.id;
        if (!id) return;
        this.viewProvider.goForward(id);
        break;
      }

      case 'TAB_RELOAD': {
        const id = action.payload?.id;
        if (!id) return;
        this.viewProvider.reloadView(id);
        break;
      }

      case 'TAB_GO_HOME': {
        const id = action.payload?.id;
        if (!id) return;
        if (this.navigateTab.execute(id, 'veil://home')) {
          this.broadcastState();
        }
        break;
      }

      case 'TAB_PIN': {
        const id = action.payload?.id;
        if (!id) return;
        const tab = this.tabRepo.getById(id);
        if (tab) {
          // Toggle pinned state
          if (!this.pinnedTabs.has(id)) {
            this.pinnedTabs.add(id);
          } else {
            this.pinnedTabs.delete(id);
          }
          // Persist UI state (A4)
          this.tabRepo.setPinnedIds([...this.pinnedTabs]);
          this.broadcastState();
        }
        break;
      }

      case 'TAB_MUTE': {
        const id = action.payload?.id;
        if (!id) return;
        const muted = !this.mutedTabs.has(id);
        if (muted) {
          this.mutedTabs.add(id);
        } else {
          this.mutedTabs.delete(id);
        }
        this.viewProvider.setAudioMuted(id, muted);
        // Persist UI state (A4)
        this.tabRepo.setMutedIds([...this.mutedTabs]);
        this.broadcastState();
        break;
      }

      case 'TAB_CLOSE_OTHERS': {
        const keepId = action.payload?.id;
        if (!keepId) return;
        const allTabs = this.tabRepo.getAll();
        for (const tab of allTabs) {
          if (tab.id !== keepId) {
            try {
              this.closeTab.execute(tab.id);
              this.registeredListeners.delete(tab.id);
            } catch { /* tab already closed */ }
          }
        }
        this.focusTab.execute(keepId);
        this.broadcastState();
        break;
      }

      case 'TAB_CLOSE_TO_RIGHT': {
        const afterId = action.payload?.id;
        if (!afterId) return;
        const allTabs = this.tabRepo.getAll();
        const idx = allTabs.findIndex(t => t.id === afterId);
        if (idx === -1) return;
        for (let i = allTabs.length - 1; i > idx; i--) {
          try {
            this.closeTab.execute(allTabs[i].id);
            this.registeredListeners.delete(allTabs[i].id);
          } catch { /* tab already closed */ }
        }
        this.broadcastState();
        break;
      }

      case 'TAB_GROUP_CREATE': {
        const { name, color } = action.payload;
        if (!name || typeof name !== 'string') return;
        const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const group: TabGroup = {
          id: groupId,
          name: name.trim().slice(0, 100),
          color: typeof color === 'string' ? color : '#8AB4F8',
          collapsed: false,
        };
        this.tabGroups.push(group);
        this.tabRepo.setTabGroups(this.tabGroups);
        this.broadcastState();
        break;
      }

      case 'TAB_GROUP_DELETE': {
        const groupId = action.payload?.id;
        if (!groupId) return;
        this.tabGroups = this.tabGroups.filter(g => g.id !== groupId);
        // Unassign all tabs from this group
        for (const tab of this.tabRepo.getAll()) {
          if (tab.groupId === groupId) {
            tab.setGroupId(undefined);
          }
        }
        this.tabRepo.setTabGroups(this.tabGroups);
        this.broadcastState();
        break;
      }

      case 'TAB_GROUP_RENAME': {
        const { id, name } = action.payload;
        if (!id || !name) return;
        const group = this.tabGroups.find(g => g.id === id);
        if (group) {
          group.name = name.trim().slice(0, 100);
          this.tabRepo.setTabGroups(this.tabGroups);
          this.broadcastState();
        }
        break;
      }

      case 'TAB_GROUP_TOGGLE': {
        const toggleId = action.payload?.id;
        if (!toggleId) return;
        const toggleGroup = this.tabGroups.find(g => g.id === toggleId);
        if (toggleGroup) {
          toggleGroup.collapsed = !toggleGroup.collapsed;
          this.tabRepo.setTabGroups(this.tabGroups);
          this.broadcastState();
        }
        break;
      }

      case 'TAB_MOVE_TO_GROUP': {
        const { tabId, groupId } = action.payload;
        if (!tabId) return;
        const tab = this.tabRepo.getById(tabId);
        if (!tab) return;
        // Validate groupId exists if not null
        if (groupId !== null && groupId !== undefined) {
          const targetGroup = this.tabGroups.find(g => g.id === groupId);
          if (!targetGroup) return;
        }
        tab.setGroupId(groupId || undefined);
        this.broadcastState();
        break;
      }
    }
  }

  private registerViewListeners(tabId: string) {
    this.registeredListeners.add(tabId);
    this.viewProvider.registerViewListeners(tabId, {
      onTitleChanged: (title) => {
        const tab = this.tabRepo.getById(tabId);
        if (tab) {
          tab.updateTitle(title);
          this.broadcastState();
          this.eventBus.emit(EventTypes.TAB_TITLE_CHANGED, { id: tabId, title });
        }
      },
      onFaviconChanged: (favicon) => {
        const tab = this.tabRepo.getById(tabId);
        if (tab) {
          tab.updateFavicon(favicon);
          this.broadcastState();
        }
      },
      onStartLoading: () => {
        const tab = this.tabRepo.getById(tabId);
        if (tab) {
          tab.startLoading();
          this.broadcastState();
          this.eventBus.emit(EventTypes.TAB_LOADING, { id: tabId, isLoading: true });
        }
      },
      onStopLoading: () => {
        const tab = this.tabRepo.getById(tabId);
        if (tab) {
          tab.stopLoading();
          this.broadcastState();
          this.eventBus.emit(EventTypes.TAB_LOADING, { id: tabId, isLoading: false });
        }
      },
      onProgress: (progress: number) => {
        const tab = this.tabRepo.getById(tabId);
        if (tab) {
          tab.updateProgress(progress);
          this.broadcastState();
        }
      },
      onNavigate: (url, canGoBack, canGoForward) => {
        const tab = this.tabRepo.getById(tabId);
        if (tab) {
          tab.setUrl(url);
          tab.updateNavigationState(canGoBack, canGoForward);
          this.broadcastState();
        }
      },
      onOpenInNewTab: (url) => {
        // Open link in new tab (middle-click or Ctrl+click)
        if (!this.isSafeUrl(url)) return;
        try {
          const tab = this.createTab.execute(url);
          this.registerViewListeners(tab.id);
          this.broadcastState();
          this.eventBus.emit(EventTypes.TAB_CREATED, tab.toJSON());
        } catch (error) {
          this.errorHandler.handle('TAB_VIEW_CREATE_FAILED', String(error), ErrorSeverity.HIGH, 'TabService');
        }
      },
      onAudioStateChanged: (isPlaying) => {
        const tab = this.tabRepo.getById(tabId);
        if (tab) {
          tab.setAudioState(isPlaying);
          this.broadcastState();
        }
      },
    });
  }
}
