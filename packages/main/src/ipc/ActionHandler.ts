import { ipcMain, BrowserWindow } from "electron"
import type { VeilAction } from "@veil/shared"
import { IPC_ACTION, IPC_SEARCH } from "@veil/shared"
import type { ViewManager } from "../tabs/ViewManager"
import type { AdblockEngine } from "../network/AdblockEngine"
import type { ExtensionHost } from "../network/ExtensionHost"
import type { SettingsManager } from "../settings/SettingsManager"
import type { WorkspaceManager } from "../workspaces/WorkspaceManager"
import type { PrivacyStatsService } from "../network/PrivacyStats"
import { StateBroadcaster } from "./StateBroadcaster"
import { AIBridge } from "../ai/AIBridge"
import { workerManager } from "../workers/WorkerManager"

export function registerIPC(
  win: BrowserWindow,
  viewManager: ViewManager,
  workspaceManager: WorkspaceManager,
  adblock: AdblockEngine,
  extensions: ExtensionHost,
  settingsManager: SettingsManager,
  privacyStats: PrivacyStatsService,
) {
  StateBroadcaster.init(win)
  const aiBridge = new AIBridge()

  // Resize views when window resizes
  win.on("resize", () => viewManager.resize())

  ipcMain.handle(IPC_ACTION, async (_event, action: VeilAction) => {
    try {
      switch (action.type) {

      // Tab lifecycle
      case "TAB_NEW": {
        if (!viewManager) {
          console.error("[IPC] TAB_NEW: viewManager not initialized")
          return null
        }
        const tabId = viewManager.createTab(action.payload)
        if (!workspaceManager) {
          console.error("[IPC] TAB_NEW: workspaceManager not initialized")
          return tabId
        }
        workspaceManager.addTabToWorkspace(tabId, action.payload.workspaceId ?? "work")
        return tabId
      }

      case "TAB_CLOSE": {
        const tabId = action.payload.tabId
        if (workspaceManager) {
          workspaceManager.removeTabFromWorkspace(tabId)
        } else {
          console.warn("[IPC] TAB_CLOSE: workspaceManager not initialized")
        }
        if (!viewManager) {
          console.error("[IPC] TAB_CLOSE: viewManager not initialized")
          return null
        }
        return viewManager.closeTab(tabId)
      }

      case "TAB_FOCUS":
        if (!viewManager) return
        return viewManager.focusTab(action.payload.tabId)

      case "TAB_NAVIGATE":
        if (!viewManager) return
        return viewManager.navigate(action.payload.tabId, action.payload.url)

      case "TAB_GO_BACK":
        if (!viewManager) return
        return viewManager.goBack(action.payload.tabId)

      case "TAB_GO_FORWARD":
        if (!viewManager) return
        return viewManager.goForward(action.payload.tabId)

      case "TAB_RELOAD":
        if (!viewManager) return
        return viewManager.reload(action.payload.tabId)

      case "TAB_MOVE_WORKSPACE":
        if (!workspaceManager) {
          console.error("[IPC] TAB_MOVE_WORKSPACE: workspaceManager not initialized")
          return
        }
        workspaceManager.moveTab(action.payload.tabId, action.payload.workspaceId)
        break

      // Audio
      case "AUDIO_MUTE": {
        if (!viewManager) return
        const view = viewManager.getView(action.payload.tabId)
        view?.webContents.setAudioMuted(action.payload.muted)
        break
      }

      case "AUDIO_VOLUME":
        // WebContents does not support volume natively
        console.log("[IPC] AUDIO_VOLUME: using WebContents API in future")
        break

      // Adblock
      case "ADBLOCK_TOGGLE":
        if (action.payload.enabled) {
          adblock?.enable()
        } else {
          adblock?.disable()
        }
        break

      case "ADBLOCK_WHITELIST":
        adblock?.addToWhitelist(action.payload.hostname)
        break

      // Workspace
      case "WORKSPACE_SWITCH":
        if (!workspaceManager) {
          console.error("[IPC] WORKSPACE_SWITCH: workspaceManager not initialized")
          return
        }
        workspaceManager.switch(action.payload.id)
        break

      case "WORKSPACE_CREATE":
        if (!workspaceManager) {
          console.error("[IPC] WORKSPACE_CREATE: workspaceManager not initialized")
          return
        }
        workspaceManager.create(action.payload)
        break

      case "WORKSPACE_DELETE":
        if (!workspaceManager) {
          console.error("[IPC] WORKSPACE_DELETE: workspaceManager not initialized")
          return
        }
        workspaceManager.delete(action.payload.id)
        break

      // Extensions
      case "EXT_INSTALL":
        await extensions.load(action.payload.path)
        break

      case "EXT_REMOVE":
        await extensions.remove(action.payload.extensionId)
        break

      case "EXT_TOGGLE":
        // Per-workspace enable/disable - future implementation
        console.log("[IPC] EXT_TOGGLE: per-workspace toggle not yet implemented")
        break

      // Command Palette / Search
      case "SEARCH_QUERY": {
        const storageWorker = workerManager.get("storage")
        if (storageWorker) {
          storageWorker.postMessage({ type: "HISTORY_QUERY", payload: { q: action.payload.q } })
          storageWorker.once("message", (msg) => {
            if (msg.type === "HISTORY_RESULTS") {
              StateBroadcaster.emit(IPC_SEARCH, msg.results)
            }
          })
        }
        break
      }

      // AI Bridge
      case "AI_QUERY": {
        const aiWorker = workerManager.get("ai-bridge")
        if (aiWorker) {
          aiWorker.postMessage({ type: "QUERY", payload: { prompt: action.payload.prompt } })
          aiWorker.once("message", (msg) => {
            if (msg.type === "RESPONSE" && msg.payload?.text) {
              StateBroadcaster.patch({
                searchResults: [{ id: "ai-response", type: "web", title: msg.payload.text }],
              })
            }
          })
        } else {
          // Fallback if worker not available
          const response = await aiBridge.query(action.payload.prompt)
          StateBroadcaster.patch({
            searchResults: [{ id: "ai-response", type: "web", title: response }],
          })
        }
        break
      }

      // Settings
      case "SETTINGS_UPDATE":
        settingsManager.update(action.payload.path, action.payload.value)
        break

      case "SETTINGS_RESET":
        settingsManager.reset()
        break

      case "SETTINGS_OPEN_DOWNLOADS_DIR":
        settingsManager.openDownloadsDir()
        break

      // Window management
      case "WINDOW_MINIMIZE":
        win.minimize()
        break
      case "WINDOW_MAXIMIZE":
        win.isMaximized() ? win.unmaximize() : win.maximize()
        break
      case "WINDOW_CLOSE":
        win.close()
        break

      default:
        console.warn("[IPC] Unhandled action:", (action as { type: string }).type)
    }
    } catch (error) {
      console.error(`[IPC] Error handling action ${action.type}:`, error)
    }
  })
}
