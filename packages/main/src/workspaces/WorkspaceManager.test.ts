import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkspaceManager } from './WorkspaceManager'
import type { ViewManager } from '../tabs/ViewManager'
import type { StateBroadcasterInterface } from '../ipc/StateBroadcaster'
import type { WorkspaceMeta, TabMeta } from '@veil/shared'

// Mock ViewManager
class MockViewManager {
  public hideBrowserView = vi.fn()
  public showBrowserView = vi.fn()
  public focusTab = vi.fn()
  public getAll = vi.fn(() => [])
  public createTab = vi.fn(() => 'tab-id')
}

// Mock StateBroadcaster
class MockStateBroadcaster implements StateBroadcasterInterface {
  public patch = vi.fn()
  public emit = vi.fn()
}

describe('WorkspaceManager', () => {
  let viewManager: MockViewManager
  let broadcaster: MockStateBroadcaster
  let workspaceManager: WorkspaceManager

  beforeEach(() => {
    viewManager = new MockViewManager()
    broadcaster = new MockStateBroadcaster()
    workspaceManager = new WorkspaceManager(viewManager as unknown as ViewManager, broadcaster)
  })

  describe('create()', () => {
    it('adds workspace to list', () => {
      const workspace = workspaceManager.create({
        name: 'Test Workspace',
        icon: '🧪',
        accentColor: '#FF0000',
      })

      expect(workspace.name).toBe('Test Workspace')
      expect(workspace.icon).toBe('🧪')
      expect(workspace.accentColor).toBe('#FF0000')
      expect(workspace.tabIds).toEqual([])

      const all = workspaceManager.getAll()
      expect(all.length).toBe(1)
      expect(all[0].id).toBe(workspace.id)
    })

    it('uses default icon and accentColor when not provided', () => {
      const workspace = workspaceManager.create({ name: 'Default Workspace' })

      expect(workspace.icon).toBe('📁')
      expect(workspace.accentColor).toBe('#4A9EFF')
    })

    it('broadcasts state after creation', () => {
      workspaceManager.create({ name: 'Test' })

      expect(broadcaster.patch).toHaveBeenCalledTimes(1)
      expect(broadcaster.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaces: expect.arrayContaining([]),
          activeWorkspaceId: expect.any(String),
        })
      )
    })
  })

  describe('getAll()', () => {
    it('returns all workspaces', () => {
      const ws1 = workspaceManager.create({ name: 'Workspace 1' })
      const ws2 = workspaceManager.create({ name: 'Workspace 2' })
      const ws3 = workspaceManager.create({ name: 'Workspace 3' })

      const all = workspaceManager.getAll()

      expect(all.length).toBe(3)
      const allIds = all.map(w => w.id)
      expect(allIds).toContain(ws1.id)
      expect(allIds).toContain(ws2.id)
      expect(allIds).toContain(ws3.id)
    })

    it('returns empty array when no workspaces created', () => {
      // Note: activeWorkspaceId is initialized to "work" but no workspace exists yet
      const all = workspaceManager.getAll()
      expect(all).toEqual([])
    })
  })

  describe('switch()', () => {
    let ws1: WorkspaceMeta
    let ws2: WorkspaceMeta
    let tab1: TabMeta
    let tab2: TabMeta

    beforeEach(() => {
      ws1 = workspaceManager.create({ name: 'Workspace 1' })
      ws2 = workspaceManager.create({ name: 'Workspace 2' })

      tab1 = {
        id: 'tab-1',
        workspaceId: ws1.id,
        url: 'https://example.com',
        title: 'Tab 1',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        isAudible: false,
        isMuted: false,
      }

      tab2 = {
        id: 'tab-2',
        workspaceId: ws2.id,
        url: 'https://example.org',
        title: 'Tab 2',
        isLoading: false,
        canGoBack: false,
        canGoForward: false,
        isAudible: false,
        isMuted: false,
      }

      // Mock getAll to return tabs for both workspaces
      vi.mocked(viewManager.getAll).mockReturnValue([
        { id: tab1.id, meta: tab1, view: {} as any },
        { id: tab2.id, meta: tab2, view: {} as any },
      ] as any)
    })

    it('hides BrowserView of previous workspace', () => {
      // Start with ws1 active (default is "work", so first switch to ws1)
      workspaceManager.switch(ws1.id)
      vi.mocked(viewManager.hideBrowserView).mockClear()

      // Switch to ws2
      workspaceManager.switch(ws2.id)

      expect(viewManager.hideBrowserView).toHaveBeenCalledWith(tab1.id)
    })

    it('shows BrowserView of new workspace', () => {
      workspaceManager.switch(ws1.id)
      vi.mocked(viewManager.showBrowserView).mockClear()

      workspaceManager.switch(ws2.id)

      expect(viewManager.showBrowserView).toHaveBeenCalledWith(tab2.id)
    })

    it('updates activeWorkspaceId', () => {
      expect(workspaceManager.getActiveId()).toBe('work')

      workspaceManager.switch(ws1.id)

      expect(workspaceManager.getActiveId()).toBe(ws1.id)
    })

    it('focuses first tab of new workspace', () => {
      // Clear any previous calls from beforeEach
      vi.mocked(viewManager.focusTab).mockClear()

      workspaceManager.switch(ws2.id)

      // Should focus tab-2 which belongs to ws2
      expect(viewManager.focusTab).toHaveBeenCalledWith(tab2.id)
    })

    it('broadcasts state after switch', () => {
      workspaceManager.switch(ws2.id)

      expect(broadcaster.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          activeWorkspaceId: ws2.id,
        })
      )
    })

    it('does nothing if workspace not found', () => {
      workspaceManager.switch('non-existent-id')

      expect(viewManager.hideBrowserView).not.toHaveBeenCalled()
      expect(viewManager.showBrowserView).not.toHaveBeenCalled()
      expect(viewManager.focusTab).not.toHaveBeenCalled()
    })
  })

  describe('moveTab()', () => {
    let ws1: WorkspaceMeta
    let ws2: WorkspaceMeta
    const tabId = 'tab-to-move'

    beforeEach(() => {
      ws1 = workspaceManager.create({ name: 'Workspace 1' })
      ws2 = workspaceManager.create({ name: 'Workspace 2' })

      // Manually add tab to ws1
      workspaceManager.addTabToWorkspace(tabId, ws1.id)
      
      // Clear mock calls from setup
      broadcaster.patch.mockClear()
    })

    it('moves tabId from one workspace to another', () => {
      expect(workspaceManager.getAll().find(w => w.id === ws1.id)?.tabIds).toContain(tabId)
      expect(workspaceManager.getAll().find(w => w.id === ws2.id)?.tabIds).not.toContain(tabId)

      workspaceManager.moveTab(tabId, ws2.id)

      expect(workspaceManager.getAll().find(w => w.id === ws1.id)?.tabIds).not.toContain(tabId)
      expect(workspaceManager.getAll().find(w => w.id === ws2.id)?.tabIds).toContain(tabId)
    })

    it('broadcasts state after move', () => {
      workspaceManager.moveTab(tabId, ws2.id)

      expect(broadcaster.patch).toHaveBeenCalledTimes(1)
    })

    it('does nothing if target workspace not found', () => {
      const patchCallsBefore = broadcaster.patch.mock.calls.length

      workspaceManager.moveTab(tabId, 'non-existent')

      expect(broadcaster.patch).toHaveBeenCalledTimes(patchCallsBefore)
    })
  })

  describe('delete()', () => {
    let ws1: WorkspaceMeta
    let ws2: WorkspaceMeta

    beforeEach(() => {
      ws1 = workspaceManager.create({ name: 'Workspace 1' })
      ws2 = workspaceManager.create({ name: 'Workspace 2' })
      
      // Verify we have 2 workspaces
      expect(workspaceManager.getAll().length).toBe(2)
    })

    it('removes workspace from list', () => {
      const beforeCount = workspaceManager.getAll().length
      
      workspaceManager.delete(ws1.id)

      const after = workspaceManager.getAll()
      expect(after.find(w => w.id === ws1.id)).toBeUndefined()
      expect(after.length).toBe(beforeCount - 1)
    })

    it('switches to another workspace if deleting active', () => {
      workspaceManager.switch(ws1.id)
      expect(workspaceManager.getActiveId()).toBe(ws1.id)

      workspaceManager.delete(ws1.id)

      expect(workspaceManager.getActiveId()).toBe(ws2.id)
    })

    it('broadcasts state after deletion', () => {
      workspaceManager.delete(ws1.id)

      expect(broadcaster.patch).toHaveBeenCalled()
    })

    it('warns and does nothing when deleting last workspace', () => {
      const consoleWarn = console.warn
      console.warn = vi.fn()

      // Delete first workspace
      workspaceManager.delete(ws1.id)
      // Try to delete the remaining workspace
      workspaceManager.delete(ws2.id)

      expect(console.warn).toHaveBeenCalledWith('[WorkspaceManager] Cannot delete the last workspace')
      expect(workspaceManager.getAll().length).toBe(1)

      console.warn = consoleWarn
    })
  })

  describe('addTabToWorkspace()', () => {
    let ws: WorkspaceMeta

    beforeEach(() => {
      ws = workspaceManager.create({ name: 'Test Workspace' })
    })

    it('adds tabId to workspace', () => {
      workspaceManager.addTabToWorkspace('new-tab', ws.id)

      expect(workspaceManager.getAll().find(w => w.id === ws.id)?.tabIds).toContain('new-tab')
    })

    it('does not add duplicate tabId', () => {
      workspaceManager.addTabToWorkspace('tab-1', ws.id)
      workspaceManager.addTabToWorkspace('tab-1', ws.id)

      expect(workspaceManager.getAll().find(w => w.id === ws.id)?.tabIds.filter(id => id === 'tab-1').length).toBe(1)
    })

    it('broadcasts state after adding', () => {
      workspaceManager.addTabToWorkspace('new-tab', ws.id)

      expect(broadcaster.patch).toHaveBeenCalled()
    })
  })

  describe('removeTabFromWorkspace()', () => {
    let ws1: WorkspaceMeta
    let ws2: WorkspaceMeta
    const tabId = 'tab-to-remove'

    beforeEach(() => {
      ws1 = workspaceManager.create({ name: 'Workspace 1' })
      ws2 = workspaceManager.create({ name: 'Workspace 2' })
      workspaceManager.addTabToWorkspace(tabId, ws1.id)
      workspaceManager.addTabToWorkspace(tabId, ws2.id)
    })

    it('removes tabId from all workspaces', () => {
      workspaceManager.removeTabFromWorkspace(tabId)

      expect(workspaceManager.getAll().find(w => w.id === ws1.id)?.tabIds).not.toContain(tabId)
      expect(workspaceManager.getAll().find(w => w.id === ws2.id)?.tabIds).not.toContain(tabId)
    })

    it('broadcasts state after removal', () => {
      workspaceManager.removeTabFromWorkspace(tabId)

      expect(broadcaster.patch).toHaveBeenCalled()
    })
  })
})
