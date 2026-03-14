import { BrowserView, BrowserWindow, session } from 'electron'
import { randomUUID } from 'node:crypto'
import type { TabMeta } from '@veil/shared'
import type { StateBroadcasterInterface } from '../ipc/StateBroadcaster'
import type { PrivacyStatsService } from '../network/PrivacyStats'

interface TabEntry {
  id: string
  view: BrowserView
  meta: TabMeta
  eventListeners: Map<string, (...args: any[]) => void>
}

interface CreateTabOptions {
  url?: string
  workspaceId?: string
}

const SHELL_HEIGHT = 72 // px — height of the React tab bar / address bar

export class ViewManager {
  private tabs = new Map<string, TabEntry>()
  private activeTabId: string | null = null
  private win: BrowserWindow
  private broadcaster: StateBroadcasterInterface
  private privacyStats: PrivacyStatsService

  constructor(win: BrowserWindow, broadcaster: StateBroadcasterInterface, privacyStats: PrivacyStatsService) {
    this.win = win
    this.broadcaster = broadcaster
    this.privacyStats = privacyStats
  }

  createTab(opts: CreateTabOptions = {}): string {
    const id = randomUUID()
    const url = opts.url ?? 'https://www.google.com'
    const workspaceId = opts.workspaceId ?? 'work'

    const view = new BrowserView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    })

    this.win.addBrowserView(view)
    this._resizeView(view)

    const meta: TabMeta = {
      id,
      url,
      title: 'New Tab',
      favicon: undefined,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isAudible: false,
      isMuted: false,
      workspaceId,
    }

    this.tabs.set(id, { id, view, meta, eventListeners: new Map() })

    // Wire up WebContents events → state patches
    this._bindViewEvents(id, view)

    view.webContents.loadURL(url)
    this.focusTab(id)

    return id
  }

  focusTab(tabId: string) {
    const entry = this.tabs.get(tabId)
    if (!entry) return

    // Hide all views first
    for (const [, e] of this.tabs) {
      e.view.setBounds({ x: 0, y: 0, width: 0, height: 0 }) // hide
    }

    // Set bounds and bring to top for the focused tab only
    const { width, height } = this.win.getContentBounds()
    entry.view.setBounds({ x: 0, y: SHELL_HEIGHT, width, height: height - SHELL_HEIGHT })
    this.win.setTopBrowserView(entry.view)
    this.activeTabId = tabId

    this.broadcaster.patch({ activeTabId: tabId })
  }

  closeTab(tabId: string) {
    const entry = this.tabs.get(tabId)
    if (!entry) return

    // Remove event listeners to prevent memory leaks
    const wc = entry.view.webContents
    for (const [event, listener] of entry.eventListeners) {
      wc.off(event as any, listener)
    }
    entry.eventListeners.clear()

    this.win.removeBrowserView(entry.view)
    entry.view.webContents.close()
    this.tabs.delete(tabId)

    // Clear privacy stats for this tab
    this.privacyStats.clearTab(tabId)

    // Focus another tab if possible
    if (this.activeTabId === tabId) {
      const remaining = [...this.tabs.keys()]
      if (remaining.length > 0) {
        this.focusTab(remaining[remaining.length - 1])
      } else {
        this.activeTabId = null
      }
    }

    this._broadcastTabs()
  }

  navigate(tabId: string, url: string) {
    const entry = this.tabs.get(tabId)
    if (!entry) return
    // Ensure URL has protocol
    const target = url.startsWith('http') ? url : `https://${url}`
    entry.view.webContents.loadURL(target)
  }

  goBack(tabId: string) { this.tabs.get(tabId)?.view.webContents.goBack() }
  goForward(tabId: string) { this.tabs.get(tabId)?.view.webContents.goForward() }
  reload(tabId: string) { this.tabs.get(tabId)?.view.webContents.reload() }

  getAll(): TabEntry[] { return [...this.tabs.values()] }
  getView(tabId: string): BrowserView | undefined { return this.tabs.get(tabId)?.view }

  hideBrowserView(tabId: string) {
    const entry = this.tabs.get(tabId)
    if (!entry) return
    this.win.removeBrowserView(entry.view)
  }

  showBrowserView(tabId: string) {
    const entry = this.tabs.get(tabId)
    if (!entry) return
    this.win.addBrowserView(entry.view)
    this._resizeView(entry.view)
  }

  resize() {
    for (const { view } of this.tabs.values()) {
      this._resizeView(view)
    }
  }

  private _resizeView(view: BrowserView) {
    const { width, height } = this.win.getContentBounds()
    view.setBounds({ x: 0, y: SHELL_HEIGHT, width, height: height - SHELL_HEIGHT })
    view.setAutoResize({ width: true, height: true })
  }

  private _broadcastTabs() {
    const tabs = [...this.tabs.values()].map(e => e.meta)
    this.broadcaster.patch({ tabs })
  }

  private _bindViewEvents(tabId: string, view: BrowserView) {
    const wc = view.webContents
    const entry = this.tabs.get(tabId)
    if (!entry) return

    const didStartLoading = () => {
      this._updateMeta(tabId, { isLoading: true })
    }
    const didStopLoading = () => {
      this._updateMeta(tabId, {
        isLoading: false,
        url: wc.getURL(),
        canGoBack: wc.navigationHistory?.canGoBack() ?? false,
        canGoForward: wc.navigationHistory?.canGoForward() ?? false,
      })
    }
    const pageTitleUpdated = (_: any, title: string) => {
      this._updateMeta(tabId, { title })
    }
    const pageFaviconUpdated = (_: any, favicons: string[]) => {
      this._updateMeta(tabId, { favicon: favicons[0] })
    }
    const audioStateChanged = () => {
      this._updateMeta(tabId, { isAudible: wc.isCurrentlyAudible() })
    }

    wc.on('did-start-loading', didStartLoading)
    wc.on('did-stop-loading', didStopLoading)
    wc.on('page-title-updated', pageTitleUpdated)
    wc.on('page-favicon-updated', pageFaviconUpdated)
    wc.on('audio-state-changed' as any, audioStateChanged)

    // Store listeners for cleanup
    entry.eventListeners.set('did-start-loading', didStartLoading)
    entry.eventListeners.set('did-stop-loading', didStopLoading)
    entry.eventListeners.set('page-title-updated', pageTitleUpdated)
    entry.eventListeners.set('page-favicon-updated', pageFaviconUpdated)
    entry.eventListeners.set('audio-state-changed', audioStateChanged)
  }

  private _updateMeta(tabId: string, patch: Partial<TabMeta>) {
    const entry = this.tabs.get(tabId)
    if (!entry) return
    Object.assign(entry.meta, patch)
    this._broadcastTabs()
  }
}
