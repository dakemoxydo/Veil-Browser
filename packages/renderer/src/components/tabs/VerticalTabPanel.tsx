import { useVeilStore } from '../../store/useVeilStore'
import { useIPC } from '../../hooks/useIPC'
import { X, Plus } from 'lucide-react'

/**
 * VerticalTabPanel — sidebar variant of the tab bar.
 * Toggled by user when they prefer a vertical layout.
 */
export function VerticalTabPanel() {
  const tabs = useVeilStore(s =>
    s.tabs.filter(t => t.workspaceId === s.activeWorkspaceId)
  )
  const activeTabId = useVeilStore(s => s.activeTabId)
  const activeWorkspaceId = useVeilStore(s => s.activeWorkspaceId)
  const { dispatch } = useIPC()

  return (
    <div className="glass-panel no-drag" style={{
      width: '200px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '8px',
      borderRadius: 0,
      overflowY: 'auto',
    }}>
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => dispatch({ type: 'TAB_FOCUS', payload: { tabId: tab.id } })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 8px',
            borderRadius: 'var(--radius-tab)',
            cursor: 'pointer',
            background: tab.id === activeTabId ? 'rgba(255,255,255,0.1)' : 'transparent',
          }}
        >
          {tab.favicon && <img src={tab.favicon} alt="" width={14} height={14} />}
          <span style={{ flex: 1, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tab.title || tab.url}
          </span>
          <button
            onClick={e => { e.stopPropagation(); dispatch({ type: 'TAB_CLOSE', payload: { tabId: tab.id } }) }}
            style={{ background: 'transparent', border: 'none', color: 'var(--veil-text-muted)', cursor: 'pointer' }}
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <button
        onClick={() => dispatch({ type: 'TAB_NEW', payload: { workspaceId: activeWorkspaceId } })}
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 8px',
          borderRadius: 'var(--radius-tab)',
          background: 'transparent',
          border: '1px dashed var(--veil-glass-border)',
          color: 'var(--veil-text-muted)',
          cursor: 'pointer',
          fontSize: '12px',
          width: '100%',
        }}
      >
        <Plus size={13} /> New Tab
      </button>
    </div>
  )
}
