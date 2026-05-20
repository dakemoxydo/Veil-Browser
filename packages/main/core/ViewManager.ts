import { WebContentsView, BrowserWindow } from 'electron';
import { ConfigManager } from './AppConfig';
import { ViewEventCallbacks } from './ports/ITabViewProvider';

export type { ViewEventCallbacks };

export class ViewManager {
  private shellOffset = 120;
  private views: Map<string, WebContentsView> = new Map();
  private resizeListener: (() => void) | null = null;
  private hiddenViews: Set<string> = new Set();
  private viewListeners: Map<string, (() => void)[]> = new Map();

  // Lazy loading support
  private pendingViews: Map<string, { url: string; onMaterialized?: () => void }> = new Map();
  private materializedOrder: string[] = []; // LRU order, most recent at end
  private static readonly MAX_MATERIALIZED = 5;

  constructor(private window: BrowserWindow) {
    this.resizeListener = () => this.updateAllViewBounds();
    this.window.on('resize', this.resizeListener);
  }

  public setShellOffset(offset: number) {
    this.shellOffset = offset;
    this.updateAllViewBounds();
  }

  /**
   * Creates a view for a tab. If deferred=true, stores the URL for later materialization.
   * Internal URLs (veil://*) are skipped — they have no WebContentsView.
   */
  public createView(id: string, url: string, deferred = false, onMaterialized?: () => void): void {
    if (url.startsWith('veil://')) return;
    if (deferred) {
      this.pendingViews.set(id, { url, onMaterialized });
      return;
    }
    this.createViewImmediate(id, url);
  }

  /**
   * Creates the actual WebContentsView immediately.
   */
  private createViewImmediate(id: string, url: string): WebContentsView {
    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        preload: ConfigManager.getInstance().getPreloadPath(),
      }
    });

    this.views.set(id, view);
    this.window.contentView.addChildView(view);
    this.hiddenViews.delete(id);

    this.updateViewBounds(view);

    view.webContents.loadURL(url).catch((error) => {
      console.error(`[Veil] Failed to load URL ${url} in view ${id}:`, error);
    });

    // Block navigation to unsafe protocols (javascript:, data:, file:)
    view.webContents.on('will-navigate', (event, navUrl) => {
      try {
        const parsed = new URL(navUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          event.preventDefault();
        }
      } catch {
        event.preventDefault();
      }
    });

    // Track LRU order
    this.materializedOrder.push(id);

    // Evict oldest non-focused views if we exceed the limit (A25)
    this.evictIfNecessary(id);

    return view;
  }

  /**
   * Materializes a pending view, creating the actual WebContentsView.
   * Returns true if the view was materialized, false if it wasn't pending.
   */
  public materializeView(id: string): boolean {
    const pending = this.pendingViews.get(id);
    if (!pending) return false;

    this.pendingViews.delete(id);
    this.createViewImmediate(id, pending.url);

    // Call the onMaterialized callback (e.g., to register listeners)
    if (pending.onMaterialized) {
      pending.onMaterialized();
    }

    // Evict oldest non-focused views if we exceed the limit
    this.evictIfNecessary(id);

    return true;
  }

  /**
   * Evicts the least recently used materialized view (excluding the specified id)
   * when the number of materialized views exceeds MAX_MATERIALIZED.
   */
  private evictIfNecessary(excludeId: string): void {
    while (this.views.size > ViewManager.MAX_MATERIALIZED) {
      // Find the LRU view that's not the excluded one
      const candidateIndex = this.materializedOrder.findIndex(cid => cid !== excludeId && this.views.has(cid));
      if (candidateIndex === -1) break;

      const candidateId = this.materializedOrder[candidateIndex];
      this.dematerializeView(candidateId);
    }
  }

  /**
   * Destroys a materialized view and stores it back as pending for later re-materialization.
   */
  private dematerializeView(id: string): void {
    const view = this.views.get(id);
    if (!view) return;

    const url = view.webContents.getURL();

    // Clean up registered listeners
    const listeners = this.viewListeners.get(id);
    if (listeners) {
      for (const removeListener of listeners) {
        removeListener();
      }
      this.viewListeners.delete(id);
    }

    // Remove from window and destroy the WebContentsView
    this.window.contentView.removeChildView(view);
    try {
      view.webContents.close();
    } catch {
      // already destroyed
    }

    this.views.delete(id);
    this.hiddenViews.delete(id);

    // Remove from materialized order
    const orderIndex = this.materializedOrder.indexOf(id);
    if (orderIndex !== -1) {
      this.materializedOrder.splice(orderIndex, 1);
    }

    // Store as pending for re-materialization later
    // Note: onMaterialized callback is not preserved for dematerialized views.
    // Listeners will need to be re-registered by the service layer on focus.
    this.pendingViews.set(id, { url });
  }

  private updateViewBounds(view: WebContentsView) {
    const [width, height] = this.window.getSize();
    const viewHeight = Math.max(0, height - this.shellOffset);
    view.setBounds({
      x: 0,
      y: this.shellOffset,
      width: width,
      height: viewHeight,
    });
  }

  private updateAllViewBounds() {
    for (const view of this.views.values()) {
      this.updateViewBounds(view);
    }
  }

  public getView(id: string) {
    return this.views.get(id);
  }

  /**
   * Focuses a view. If the view is pending, materializes it first.
   */
  public focusView(id: string) {
    // Materialize if pending
    if (this.pendingViews.has(id)) {
      this.materializeView(id);
    }

    const view = this.views.get(id);
    if (view) {
      if (this.hiddenViews.has(id)) {
        this.window.contentView.addChildView(view);
        this.hiddenViews.delete(id);
      }
      this.updateViewBounds(view);

      // Update LRU order
      const orderIndex = this.materializedOrder.indexOf(id);
      if (orderIndex !== -1) {
        this.materializedOrder.splice(orderIndex, 1);
      }
      this.materializedOrder.push(id);
    }
  }

  public hideAllViews() {
    for (const [id, view] of this.views.entries()) {
      try {
        this.window.contentView.removeChildView(view);
        this.hiddenViews.add(id);
      } catch {
        // view might already be removed
      }
    }
  }

  public showAllViews() {
    for (const [id, view] of this.views.entries()) {
      if (this.hiddenViews.has(id)) {
        this.window.contentView.addChildView(view);
        this.hiddenViews.delete(id);
      }
    }
  }

  public closeView(id: string) {
    // Handle pending views
    if (this.pendingViews.has(id)) {
      this.pendingViews.delete(id);
      return;
    }

    const view = this.views.get(id);
    if (view) {
      // Clean up registered listeners before destroying
      const listeners = this.viewListeners.get(id);
      if (listeners) {
        for (const removeListener of listeners) {
          removeListener();
        }
        this.viewListeners.delete(id);
      }
      this.window.contentView.removeChildView(view);
      try {
        view.webContents.close();
      } catch {
        // already destroyed
      }
      this.views.delete(id);
      this.hiddenViews.delete(id);

      // Remove from materialized order
      const orderIndex = this.materializedOrder.indexOf(id);
      if (orderIndex !== -1) {
        this.materializedOrder.splice(orderIndex, 1);
      }
    }
  }

  /**
   * Navigates a view to a URL. Updates pending URL if the view is pending.
   * If the view doesn't exist (e.g., was an internal veil:// tab), creates one.
   */
  public navigateView(id: string, url: string): void {
    // Internal URLs — no view needed
    if (url.startsWith('veil://')) return;

    // Update pending URL if not yet materialized
    const pending = this.pendingViews.get(id);
    if (pending) {
      pending.url = url;
      return;
    }

    const view = this.views.get(id);
    if (view) {
      view.webContents.loadURL(url).catch((error) => {
        console.error(`[Veil] Failed to navigate view ${id} to ${url}:`, error);
      });
    } else {
      // Tab had no view (was an internal page) — create one now
      this.createViewImmediate(id, url);
    }
  }

  public goBack(id: string): boolean {
    const view = this.views.get(id);
    if (view?.webContents.canGoBack()) {
      view.webContents.goBack();
      return true;
    }
    return false;
  }

  public goForward(id: string): boolean {
    const view = this.views.get(id);
    if (view?.webContents.canGoForward()) {
      view.webContents.goForward();
      return true;
    }
    return false;
  }

  public reloadView(id: string): void {
    const view = this.views.get(id);
    view?.webContents.reload();
  }

  public canGoBack(id: string): boolean {
    return this.views.get(id)?.webContents.canGoBack() ?? false;
  }

  public canGoForward(id: string): boolean {
    return this.views.get(id)?.webContents.canGoForward() ?? false;
  }

  public setAudioMuted(id: string, muted: boolean): void {
    const view = this.views.get(id);
    if (view) {
      view.webContents.setAudioMuted(muted);
    }
  }

  /**
   * Checks if a view is pending (not yet materialized).
   */
  public isViewPending(id: string): boolean {
    return this.pendingViews.has(id);
  }

  public registerViewListeners(id: string, callbacks: ViewEventCallbacks): void {
    const view = this.views.get(id);
    if (!view) return;

    // Clean up existing listeners before re-registering
    const existingListeners = this.viewListeners.get(id);
    if (existingListeners) {
      for (const removeListener of existingListeners) {
        removeListener();
      }
      this.viewListeners.delete(id);
    }

    const cleanups: (() => void)[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addTrackedListener = (event: string, listener: (...args: any[]) => void) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      view.webContents.on(event as any, listener);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cleanups.push(() => view.webContents.removeListener(event as any, listener));
    };

    addTrackedListener('page-title-updated', (_event, title) => {
      callbacks.onTitleChanged(title as string);
    });

    addTrackedListener('page-favicon-updated', (_event, favicons) => {
      if ((favicons as string[]).length > 0) {
        callbacks.onFaviconChanged((favicons as string[])[0]);
      }
    });

    addTrackedListener('did-start-loading', () => {
      callbacks.onStartLoading();
      callbacks.onProgress(0);
    });

    addTrackedListener('did-stop-loading', () => {
      callbacks.onProgress(100);
      callbacks.onStopLoading();
    });

    // Update URL early when navigation starts (for faster address bar updates)
    addTrackedListener('did-start-navigation', (_event, url, isInPlace, isMainFrame) => {
      if (isMainFrame) {
        callbacks.onNavigate(url as string, view.webContents.canGoBack(), view.webContents.canGoForward());
      }
    });

    addTrackedListener('did-navigate', (_event, url) => {
      callbacks.onNavigate(url as string, view.webContents.canGoBack(), view.webContents.canGoForward());
    });

    addTrackedListener('did-navigate-in-page', (_event, url) => {
      callbacks.onNavigate(url as string, view.webContents.canGoBack(), view.webContents.canGoForward());
    });

    addTrackedListener('did-fail-load', (_event, errorCode, _errorDesc) => {
      // Only handle main frame errors, not subframes
      if (errorCode !== -3) { // -3 = aborted (user navigation), not a real error
        callbacks.onStopLoading();
      }
    });

    // Link hover events for StatusBar
    addTrackedListener('update-target-url', (_event: unknown, url: string) => {
      this.window.webContents?.send('veil:link-hover', url);
    });

    view.webContents.setWindowOpenHandler(({ url }) => {
      // Middle-click or Ctrl+click on links opens in new tab
      if (url && url.startsWith('http')) {
        callbacks.onOpenInNewTab(url);
      }
      return { action: 'deny' };
    });

    // Audio state listeners
    addTrackedListener('media-started-playing', () => {
      callbacks.onAudioStateChanged(true);
    });
    addTrackedListener('media-paused', () => {
      callbacks.onAudioStateChanged(false);
    });

    this.viewListeners.set(id, cleanups);
  }

  public cleanup() {
    for (const [id, view] of this.views.entries()) {
      // Clean up tracked listeners
      const listeners = this.viewListeners.get(id);
      if (listeners) {
        for (const removeListener of listeners) {
          removeListener();
        }
      }
      try {
        this.window.contentView.removeChildView(view);
        view.webContents.close();
      } catch (error) {
        console.error(`[Veil] Failed to cleanup view ${id}:`, error);
      }
    }
    this.views.clear();
    this.viewListeners.clear();
    this.hiddenViews.clear();
    this.pendingViews.clear();
    this.materializedOrder = [];
    if (this.resizeListener) {
      this.window.removeListener('resize', this.resizeListener);
      this.resizeListener = null;
    }
  }
}
