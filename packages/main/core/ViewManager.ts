import { WebContentsView, BaseWindow, app } from 'electron';
import * as path from 'path';

export class ViewManager {
  private shellOffset = 120;
  private views: Map<string, WebContentsView> = new Map();
  private resizeListener: (() => void) | null = null;
  private hiddenViews: Set<string> = new Set();

  constructor(private window: BaseWindow) {
    this.resizeListener = () => this.updateAllViewBounds();
    this.window.on('resize', this.resizeListener);
  }

  public setShellOffset(offset: number) {
    this.shellOffset = offset;
    this.updateAllViewBounds();
  }

  public createView(id: string, url: string): WebContentsView {
    const preloadPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar', 'packages', 'main', 'dist', 'preload.js')
      : path.join(__dirname, '../preload.js');

    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        preload: preloadPath,
      }
    });

    this.views.set(id, view);
    this.window.contentView.addChildView(view);
    this.hiddenViews.delete(id);

    this.updateViewBounds(view);

    view.webContents.loadURL(url).catch((error) => {
      console.error(`[Veil] Failed to load URL ${url} in view ${id}:`, error);
    });

    return view;
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

  public focusView(id: string) {
    const view = this.views.get(id);
    if (view) {
      if (this.hiddenViews.has(id)) {
        this.window.contentView.addChildView(view);
        this.hiddenViews.delete(id);
      }
      this.window.contentView.addChildView(view);
      this.updateViewBounds(view);
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
    const view = this.views.get(id);
    if (view) {
      this.window.contentView.removeChildView(view);
      try {
        view.webContents.close();
      } catch {
        // already destroyed
      }
      this.views.delete(id);
      this.hiddenViews.delete(id);
    }
  }

  public cleanup() {
    for (const [id, view] of this.views.entries()) {
      try {
        this.window.contentView.removeChildView(view);
        view.webContents.close();
        this.views.delete(id);
      } catch (error) {
        console.error(`[Veil] Failed to cleanup view ${id}:`, error);
      }
    }
    this.hiddenViews.clear();
    if (this.resizeListener) {
      this.window.removeListener('resize', this.resizeListener);
      this.resizeListener = null;
    }
  }
}
