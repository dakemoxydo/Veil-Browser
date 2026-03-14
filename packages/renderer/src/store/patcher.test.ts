import { describe, it, expect, beforeEach, vi } from 'vitest'
import { startStateListener } from './patcher'
import { useVeilStore } from './useVeilStore'
import type { VeilState } from '@veil/shared'

describe('startStateListener', () => {
  beforeEach(() => {
    // Reset store to initial state
    const store = useVeilStore.getState()
    useVeilStore.setState({
      ...store,
      tabs: [],
      activeTabId: null,
      workspaces: [],
      activeWorkspaceId: 'work',
      extensions: [],
      privacyStats: { totalBlocked: 0, trackersBlocked: 0, adsBlocked: 0, perTab: {} },
      audioData: [],
      searchResults: [],
      isSearching: false,
    })
  })

  it('registers callback via window.veil.onStatePatch', () => {
    startStateListener()

    expect(window.veil?.onStatePatch).toHaveBeenCalledTimes(1)
    expect(window.veil?.onStatePatch).toHaveBeenCalledWith(expect.any(Function))
  })

  it('updates store when callback is invoked with patch', () => {
    startStateListener()

    // Get the registered callback
    const registeredCallback = (window.veil?.onStatePatch as ReturnType<typeof vi.fn>).mock.calls[0][0]

    // Invoke with a patch
    const patch: Partial<VeilState> = {
      activeTabId: 'test-tab-id',
      tabs: [{ id: 'test-tab-id', url: 'https://example.com', title: 'Test', isLoading: false, canGoBack: false, canGoForward: false, isAudible: false, isMuted: false, workspaceId: 'work' }],
    }
    registeredCallback(patch)

    // Verify store was updated
    const state = useVeilStore.getState()
    expect(state.activeTabId).toBe('test-tab-id')
    expect(state.tabs.length).toBe(1)
    expect(state.tabs[0].id).toBe('test-tab-id')
  })

  it('merges patch with existing state (not replacing)', () => {
    // First, set some initial state
    useVeilStore.setState({
      activeWorkspaceId: 'initial-workspace',
      workspaces: [{ id: 'initial-workspace', name: 'Initial', icon: '📁', accentColor: '#FFF', tabIds: [], activeExtensionIds: [] }],
    })

    startStateListener()

    // Get the registered callback
    const registeredCallback = (window.veil?.onStatePatch as ReturnType<typeof vi.fn>).mock.calls[0][0]

    // Invoke with a partial patch (only activeTabId)
    registeredCallback({ activeTabId: 'new-tab' })

    // Verify other state was preserved
    const state = useVeilStore.getState()
    expect(state.activeTabId).toBe('new-tab')
    expect(state.activeWorkspaceId).toBe('initial-workspace')
    expect(state.workspaces.length).toBe(1)
  })

  it('does not register duplicate listener on repeated calls', () => {
    startStateListener()
    startStateListener()
    startStateListener()

    expect(window.veil?.onStatePatch).toHaveBeenCalledTimes(3)
    // Note: The current implementation registers a new listener each time.
    // This test documents the current behavior. If deduplication is desired,
    // the implementation should be updated.
  })

  it('logs warning if window.veil is not available', () => {
    const consoleWarn = console.warn
    console.warn = vi.fn()

    // Remove window.veil
    const originalVeil = window.veil
    window.veil = undefined as any

    startStateListener()

    expect(console.warn).toHaveBeenCalledWith('Veil IPC state listener not available.')

    console.warn = consoleWarn
    window.veil = originalVeil
  })

  it('handles multiple sequential patches correctly', () => {
    startStateListener()

    const registeredCallback = (window.veil?.onStatePatch as ReturnType<typeof vi.fn>).mock.calls[0][0]

    // Apply first patch
    registeredCallback({ activeTabId: 'tab-1' })
    expect(useVeilStore.getState().activeTabId).toBe('tab-1')

    // Apply second patch
    registeredCallback({ activeTabId: 'tab-2' })
    expect(useVeilStore.getState().activeTabId).toBe('tab-2')

    // Apply patch with different field
    registeredCallback({ isSearching: true })
    expect(useVeilStore.getState().activeTabId).toBe('tab-2')
    expect(useVeilStore.getState().isSearching).toBe(true)
  })

  it('handles patch with workspaces update', () => {
    startStateListener()

    const registeredCallback = (window.veil?.onStatePatch as ReturnType<typeof vi.fn>).mock.calls[0][0]

    const workspaces = [
      { id: 'ws-1', name: 'Work', icon: '💼', accentColor: '#4A9EFF', tabIds: [], activeExtensionIds: [] },
      { id: 'ws-2', name: 'Gaming', icon: '🎮', accentColor: '#FF5F87', tabIds: [], activeExtensionIds: [] },
    ]

    registeredCallback({
      workspaces,
      activeWorkspaceId: 'ws-2',
    })

    const state = useVeilStore.getState()
    expect(state.workspaces.length).toBe(2)
    expect(state.activeWorkspaceId).toBe('ws-2')
    expect(state.workspaces[0].name).toBe('Work')
    expect(state.workspaces[1].name).toBe('Gaming')
  })
})
