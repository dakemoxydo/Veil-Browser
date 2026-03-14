import { app, BrowserWindow, session } from "electron"
import path from "path"
import { ViewManager } from "./tabs/ViewManager"
import { registerIPC } from "./ipc/ActionHandler"
import { AdblockEngine } from "./network/AdblockEngine"
import { ExtensionHost } from "./network/ExtensionHost"
import { SettingsManager } from "./settings/SettingsManager"
import { StateBroadcaster } from "./ipc/StateBroadcaster"
import { PrivacyStatsService } from "./network/PrivacyStats"
import { WorkspaceManager } from "./workspaces/WorkspaceManager"
import { workerManager } from "./workers/WorkerManager"
import { DEFAULT_SETTINGS, DEFAULT_WORKSPACES } from "@veil/shared"
import { AudioController } from "./audio/AudioController"

// Prevent multiple instances
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let mainWindow: BrowserWindow | null = null
let viewManager: ViewManager | null = null
let workspaceManager: WorkspaceManager | null = null
let adblock: AdblockEngine | null = null
let privacyStats: PrivacyStatsService | null = null
let audioController: AudioController | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: true,
    backgroundMaterial: "acrylic" as any,
    backgroundColor: "#00000000",
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  // Apply Content Security Policy for additional security
  const isDev = !app.isPackaged
  const cspRules = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' http://localhost:5173",
    "style-src 'self' 'unsafe-inline' http://localhost:5173",
    "connect-src 'self' https: http://localhost:5173 ws://localhost:5173 ws://localhost:*",
    "img-src 'self' data: https: http://localhost:5173",
    "font-src 'self' data:",
  ]
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [isDev ? cspRules.join('; ') : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; img-src 'self' data: https:;"],
      },
    })
  })

  // Initialize PrivacyStats first (needed by ViewManager)
  privacyStats = new PrivacyStatsService()

  // Initialize ViewManager first (needed by WorkspaceManager)
  viewManager = new ViewManager(mainWindow, StateBroadcaster, privacyStats)

  // Initialize AudioController (needs viewManager)
  audioController = new AudioController(viewManager)
  audioController.startPolling()

  // Initialize WorkspaceManager with default workspaces
  workspaceManager = new WorkspaceManager(viewManager, StateBroadcaster)
  workspaceManager.init([...DEFAULT_WORKSPACES], 'work')

  // Initialize AdblockEngine with PrivacyStats
  adblock = new AdblockEngine(privacyStats)
  await adblock.init()

  const extensions = new ExtensionHost()

  // Load persisted settings and apply to Electron subsystems
  const settingsManager = new SettingsManager()
  settingsManager.attach(adblock)
  const loadedSettings = settingsManager.load()

  // Initialize workers
  workerManager.spawn("storage", "storage.worker.js")
  workerManager.spawn("ai-bridge", "ai-bridge.worker.js")

  // Register all IPC handlers (pass workspaceManager)
  registerIPC(mainWindow, viewManager, workspaceManager, adblock, extensions, settingsManager, privacyStats)

  // Load the React shell
  if (isDev) {
    await mainWindow.loadURL("http://localhost:5173")
    mainWindow.webContents.openDevTools({ mode: "detach" })
  } else {
    await mainWindow.loadFile(
      path.join(__dirname, "../../renderer/dist/index.html")
    )
  }

  // Once renderer is loaded, broadcast initial state
  mainWindow.webContents.on("did-finish-load", () => {
    StateBroadcaster.patch({
      settings: loadedSettings,
      workspaces: workspaceManager?.getAll() ?? [],
      activeWorkspaceId: workspaceManager?.getActiveId() ?? "work",
    })
  })

  // Open first tab
  viewManager.createTab({ url: "https://www.google.com", workspaceId: "work" })

  mainWindow.on("closed", () => {
    mainWindow = null
    viewManager = null
    workspaceManager = null
    audioController?.stopPolling()
    audioController = null
    workerManager.terminateAll()
  })

  // Save settings before quit
  app.on("before-quit", () => {
    settingsManager.save()
  })
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
    process.exit(0)
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
