import type { WorkspaceMeta } from "@veil/shared"
import type { StateBroadcasterInterface } from "../ipc/StateBroadcaster"
import type { ViewManager } from "../tabs/ViewManager"

interface WorkspaceCreateOptions {
  name: string
  icon?: string
  accentColor?: string
}

interface WorkspaceBase {
  id: string
  name: string
  icon: string
  accentColor: string
}

export class WorkspaceManager {
  private workspaces: Map<string, WorkspaceMeta> = new Map()
  private viewManager: ViewManager | null = null
  private broadcaster: StateBroadcasterInterface
  private activeWorkspaceId: string = "work"

  constructor(viewManager: ViewManager, broadcaster: StateBroadcasterInterface) {
    this.viewManager = viewManager
    this.broadcaster = broadcaster
  }

  init(workspaces: WorkspaceBase[], activeId: string) {
    for (const ws of workspaces) {
      this.workspaces.set(ws.id, {
        ...ws,
        tabIds: [],
        activeExtensionIds: [],
      })
    }
    this.activeWorkspaceId = activeId
  }

  getAll(): WorkspaceMeta[] {
    return Array.from(this.workspaces.values())
  }

  getActiveId(): string {
    return this.activeWorkspaceId
  }

  create(options: WorkspaceCreateOptions): WorkspaceMeta {
    const id = "workspace-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8)
    const workspace: WorkspaceMeta = {
      id,
      name: options.name,
      icon: options.icon ?? "📁",
      accentColor: options.accentColor ?? "#4A9EFF",
      tabIds: [],
      activeExtensionIds: [],
    }
    this.workspaces.set(id, workspace)
    this._broadcast()
    console.log("[WorkspaceManager] Created workspace: " + id)
    return workspace
  }

  delete(workspaceId: string) {
    if (this.workspaces.size <= 1) {
      console.warn("[WorkspaceManager] Cannot delete the last workspace")
      return
    }
    const ws = this.workspaces.get(workspaceId)
    if (!ws) return

    this.workspaces.delete(workspaceId)
    
    if (this.activeWorkspaceId === workspaceId) {
      const firstWs = this.workspaces.values().next().value
      if (firstWs) {
        this.switch(firstWs.id)
      }
    }
    this._broadcast()
    console.log("[WorkspaceManager] Deleted workspace: " + workspaceId)
  }

  switch(workspaceId: string) {
    const ws = this.workspaces.get(workspaceId)
    if (!ws) {
      console.warn("[WorkspaceManager] Workspace not found: " + workspaceId)
      return
    }

    const prevWorkspaceId = this.activeWorkspaceId
    this.activeWorkspaceId = workspaceId

    if (this.viewManager) {
      const allTabs = this.viewManager.getAll()

      // Hide BrowserViews of the previous workspace
      for (const tab of allTabs) {
        if (tab.meta.workspaceId === prevWorkspaceId) {
          this.viewManager.hideBrowserView(tab.id)
        }
      }

      // Show BrowserViews of the new workspace
      for (const tab of allTabs) {
        if (tab.meta.workspaceId === workspaceId) {
          this.viewManager.showBrowserView(tab.id)
        }
      }

      // Focus the first tab of the new workspace (or last active tab if tracked)
      const newWorkspaceTabs = allTabs.filter(t => t.meta.workspaceId === workspaceId)
      if (newWorkspaceTabs.length > 0) {
        const firstTab = newWorkspaceTabs[0]
        this.viewManager.focusTab(firstTab.id)
        // Update activeTabId in workspace state
        ws.tabIds = [firstTab.id, ...ws.tabIds.filter(id => id !== firstTab.id)]
      } else {
        // No tabs in new workspace, clear active tab
        this.viewManager.focusTab(null as any)
      }
    }

    this._broadcast()
    console.log("[WorkspaceManager] Switched to workspace: " + workspaceId)
  }

  moveTab(tabId: string, toWorkspaceId: string) {
    const toWs = this.workspaces.get(toWorkspaceId)
    if (!toWs) {
      console.warn("[WorkspaceManager] Target workspace not found: " + toWorkspaceId)
      return
    }

    // Create new array instead of mutating
    if (!toWs.tabIds.includes(tabId)) {
      toWs.tabIds = [...toWs.tabIds, tabId]
    }

    for (const ws of this.workspaces.values()) {
      if (ws.id !== toWorkspaceId) {
        ws.tabIds = ws.tabIds.filter(id => id !== tabId)
      }
    }

    this._broadcast()
    console.log("[WorkspaceManager] Moved tab " + tabId + " to workspace " + toWorkspaceId)
  }

  addTabToWorkspace(tabId: string, workspaceId: string) {
    const ws = this.workspaces.get(workspaceId)
    if (!ws) return
    
    if (!ws.tabIds.includes(tabId)) {
      ws.tabIds.push(tabId)
    }
    this._broadcast()
  }

  removeTabFromWorkspace(tabId: string) {
    for (const ws of this.workspaces.values()) {
      ws.tabIds = ws.tabIds.filter(id => id !== tabId)
    }
    this._broadcast()
  }

  private _broadcast() {
    this.broadcaster.patch({
      workspaces: this.getAll(),
      activeWorkspaceId: this.activeWorkspaceId,
    })
  }
}
