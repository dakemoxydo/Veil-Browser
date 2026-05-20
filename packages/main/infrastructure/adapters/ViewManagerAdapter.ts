import { ViewManager, ViewEventCallbacks } from '../../core/ViewManager';
import { ITabViewProvider } from '../../core/ports/ITabViewProvider';

/**
 * Adapter that wraps ViewManager to implement ITabViewProvider.
 */
export class ViewManagerAdapter implements ITabViewProvider {
  constructor(private readonly viewManager: ViewManager) {}

  createView(id: string, url: string, deferred?: boolean, onMaterialized?: () => void): void {
    this.viewManager.createView(id, url, deferred, onMaterialized);
  }

  materializeView(id: string): boolean {
    return this.viewManager.materializeView(id);
  }

  focusView(id: string): void {
    this.viewManager.focusView(id);
  }

  closeView(id: string): void {
    this.viewManager.closeView(id);
  }

  hideAllViews(): void {
    this.viewManager.hideAllViews();
  }

  showAllViews(): void {
    this.viewManager.showAllViews();
  }

  setShellOffset(offset: number): void {
    this.viewManager.setShellOffset(offset);
  }

  cleanup(): void {
    this.viewManager.cleanup();
  }

  navigateView(id: string, url: string): void {
    this.viewManager.navigateView(id, url);
  }

  goBack(id: string): boolean {
    return this.viewManager.goBack(id);
  }

  goForward(id: string): boolean {
    return this.viewManager.goForward(id);
  }

  reloadView(id: string): void {
    this.viewManager.reloadView(id);
  }

  canGoBack(id: string): boolean {
    return this.viewManager.canGoBack(id);
  }

  canGoForward(id: string): boolean {
    return this.viewManager.canGoForward(id);
  }

  setAudioMuted(id: string, muted: boolean): void {
    this.viewManager.setAudioMuted(id, muted);
  }

  registerViewListeners(id: string, callbacks: ViewEventCallbacks): void {
    this.viewManager.registerViewListeners(id, callbacks);
  }
}
