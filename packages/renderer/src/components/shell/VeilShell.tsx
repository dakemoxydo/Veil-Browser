import { useEffect, useState } from 'react'
import { TitleBar } from './TitleBar'
import { GlassLayer } from './GlassLayer'
import { TabBar } from '../tabs/TabBar'
import { VerticalTabPanel } from '../tabs/VerticalTabPanel'
import { AddressBar } from '../addressbar/AddressBar'
import { WorkspaceSwitcher } from '../workspaces/WorkspaceSwitcher'
import { AudioControllerUI } from '../audio/AudioController'
import { CommandPalette } from '../commandpalette/CommandPalette'
import { SettingsPanel } from '../settings/SettingsPanel'
import { NewTabPage } from '../newTab/NewTabPage'
import { startStateListener } from '../../store/patcher'
import { useCommandPalette } from '../../hooks/useCommandPalette'
import { useVeilStore } from '../../store/useVeilStore'

export function VeilShell() {
  const { isOpen: isPaletteOpen, close: closePalette } = useCommandPalette()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const tabsPosition = useVeilStore(s => s.settings.appearance.tabsPosition)
  const tabs = useVeilStore(s => s.tabs)
  const activeTabId = useVeilStore(s => s.activeTabId)
  const activeTab = tabs.find(t => t.id === activeTabId)
  
  // Only show NewTabPage when active tab is blank/new
  const shouldShowNewTabPage = !activeTab || activeTab.url === 'about:blank' || activeTab.url === ''

  useEffect(() => {
    const unsubscribe = startStateListener()
    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Layer 0 — glass background */}
      <GlassLayer />

      {/* Layer 1 — UI chrome */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 10 }}>
        <TitleBar onSettingsOpen={() => setIsSettingsOpen(true)} />
        <WorkspaceSwitcher />

        {/* Tab layout: top bar OR vertical sidebar + content */}
        {tabsPosition === 'top' ? (
          <>
            <TabBar />
            <AddressBar />
            <div style={{ flex: 1, position: 'relative' }}>
              {shouldShowNewTabPage && <NewTabPage />}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <VerticalTabPanel />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <AddressBar />
              <div style={{ flex: 1, position: 'relative' }}>
                {shouldShowNewTabPage && <NewTabPage />}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Layer 3 — floating overlays */}
      <AudioControllerUI />
      {isPaletteOpen  && <CommandPalette onClose={closePalette} />}
      {isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}
    </div>
  )
}

