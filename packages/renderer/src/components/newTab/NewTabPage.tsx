import { useVeilStore } from '../../store/useVeilStore'
import { PrivacyDashboard } from '../privacy/PrivacyDashboard'

/**
 * NewTabPage — displayed when no tabs are open or when navigating to veil://newtab.
 * Shows privacy stats and quick links.
 */
export function NewTabPage() {
  const tabs = useVeilStore(s => s.tabs)
  const activeTabId = useVeilStore(s => s.activeTabId)
  const activeTab = tabs.find(t => t.id === activeTabId)

  // Only show if active tab is new/blank
  const isNewTab = !activeTab || activeTab.url === 'about:blank' || activeTab.url === ''
  if (!isNewTab) return null

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '32px',
      zIndex: 5,
      pointerEvents: 'none',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--veil-text-primary)', letterSpacing: '-2px' }}>
          Veil
        </div>
        <div style={{ fontSize: '14px', color: 'var(--veil-text-muted)', marginTop: '4px' }}>
          Private. Fast. Yours.
        </div>
      </div>

      {/* Privacy stats card */}
      <div style={{ pointerEvents: 'all' }}>
        <PrivacyDashboard />
      </div>
    </div>
  )
}
