/**
 * Callbacks for tab view lifecycle events.
 */
export interface ViewEventCallbacks {
  onTitleChanged(title: string): void;
  onFaviconChanged(favicon: string): void;
  onStartLoading(): void;
  onStopLoading(): void;
  onProgress(progress: number): void;
  onNavigate(url: string, canGoBack: boolean, canGoForward: boolean): void;
  onOpenInNewTab(url: string): void;
  onAudioStateChanged(isPlaying: boolean): void;
}

/**
 * Port interface for tab view management.
 * Abstracts ViewManager for testability.
 */
export interface ITabViewProvider {
  createView(id: string, url: string, deferred?: boolean, onMaterialized?: () => void): void;
  materializeView(id: string): boolean;
  focusView(id: string): void;
  closeView(id: string): void;
  hideAllViews(): void;
  showAllViews(): void;
  setShellOffset(offset: number): void;
  cleanup(): void;

  /** Navigate an existing view to a URL. */
  navigateView(id: string, url: string): void;
  /** Go back in view history. Returns true if navigation occurred. */
  goBack(id: string): boolean;
  /** Go forward in view history. Returns true if navigation occurred. */
  goForward(id: string): boolean;
  /** Reload the view. */
  reloadView(id: string): void;
  /** Check if view can go back. */
  canGoBack(id: string): boolean;
  /** Check if view can go forward. */
  canGoForward(id: string): boolean;
  /** Set audio muted state for a view. */
  setAudioMuted(id: string, muted: boolean): void;
  /** Register event listeners on a view's webContents. */
  registerViewListeners(id: string, callbacks: ViewEventCallbacks): void;
}
