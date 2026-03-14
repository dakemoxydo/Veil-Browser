// Mock Electron module for testing

export class BrowserWindow {
  static getAllWindows = vi.fn(() => [])
  private _contentBounds = { x: 0, y: 0, width: 1280, height: 800 }
  private _browserViews: BrowserView[] = []

  constructor(options?: any) {
    this.webContents = {
      send: vi.fn(),
      loadURL: vi.fn(),
      loadFile: vi.fn(),
      openDevTools: vi.fn(),
      on: vi.fn(),
      navigationHistory: {
        canGoBack: vi.fn(() => false),
        canGoForward: vi.fn(() => false),
      },
    } as any
  }

  getContentBounds() {
    return { ...this._contentBounds }
  }

  setContentBounds(bounds: { x: number; y: number; width: number; height: number }) {
    this._contentBounds = { ...bounds }
  }

  addBrowserView(view: BrowserView) {
    this._browserViews.push(view)
  }

  removeBrowserView(view: BrowserView) {
    const index = this._browserViews.indexOf(view)
    if (index > -1) {
      this._browserViews.splice(index, 1)
    }
  }

  setTopBrowserView(view: BrowserView) {
    // Mock implementation
  }

  getBrowserViews() {
    return [...this._browserViews]
  }

  on = vi.fn()
  once = vi.fn()
  off = vi.fn()
  emit = vi.fn()

  webContents: any
}

export class BrowserView {
  private _bounds = { x: 0, y: 0, width: 0, height: 0 }
  private _autoResize = { width: false, height: false }

  constructor(options?: any) {
    this.webContents = {
      loadURL: vi.fn(),
      goBack: vi.fn(),
      goForward: vi.fn(),
      reload: vi.fn(),
      getURL: vi.fn(() => 'about:blank'),
      setAudioMuted: vi.fn(),
      isCurrentlyAudible: vi.fn(() => false),
      on: vi.fn(),
      navigationHistory: {
        canGoBack: vi.fn(() => false),
        canGoForward: vi.fn(() => false),
      },
    } as any
  }

  setBounds(bounds: { x: number; y: number; width: number; height: number }) {
    this._bounds = { ...bounds }
  }

  getBounds() {
    return { ...this._bounds }
  }

  setAutoResize(options: { width?: boolean; height?: boolean }) {
    this._autoResize = {
      width: options.width ?? false,
      height: options.height ?? false,
    }
  }

  getAutoResize() {
    return { ...this._autoResize }
  }

  webContents: any
}

export const session = {
  fromPartition: vi.fn(() => ({
    setPermissionRequestHandler: vi.fn(),
  })),
  defaultSession: {
    setPermissionRequestHandler: vi.fn(),
  },
}

export const app = {
  requestSingleInstanceLock: vi.fn(() => true),
  quit: vi.fn(),
  whenReady: vi.fn(() => Promise.resolve()),
  on: vi.fn(),
  isPackaged: false,
}

export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
}
