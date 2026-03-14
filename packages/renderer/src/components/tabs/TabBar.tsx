import { useVeilStore } from '../../store/useVeilStore'
import { useIPC } from '../../hooks/useIPC'
import { X, Plus, Loader } from 'lucide-react'

export function TabBar() {
  const tabs = useVeilStore(s => s.tabs.filter(t => t.workspaceId === s.activeWorkspaceId))
  const activeTabId = useVeilStore(s => s.activeTabId)
  const activeWorkspaceId = useVeilStore(s => s.activeWorkspaceId)
  const { dispatch } = useIPC()

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '0 12px 8px',
      overflowX: 'auto',
    }}>
      {tabs.map(tab => (
        <div
          key={tab.id}
          className={`tab-island glass-panel no-drag ${tab.id === activeTabId ? 'tab-active' : ''}`}
          onClick={() => dispatch({ type: 'TAB_FOCUS', payload: { tabId: tab.id } })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            minWidth: '140px',
            maxWidth: '220px',
            cursor: 'pointer',
            borderRadius: 'var(--radius-tab)',
            background: tab.id === activeTabId
              ? 'rgba(255,255,255,0.12)'
              : 'var(--veil-glass-bg)',
          }}
        >
          {tab.favicon && (
            <img src={tab.favicon} alt="" width={14} height={14} style={{ flexShrink: 0 }} />
          )}
          {tab.isLoading ? (
            <Loader size={11} style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          ) : (
            <span style={{
              flex: 1,
              fontSize: '12px',
              color: 'var(--veil-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {tab.title || tab.url}
            </span>
          )}
          {!tab.isLoading && (
            <button
              className="no-drag"
              onClick={e => { e.stopPropagation(); dispatch({ type: 'TAB_CLOSE', payload: { tabId: tab.id } }) }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--veil-text-muted)',
                cursor: 'pointer',
                padding: '2px',
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              <X size={11} />
            </button>
          )}
        </div>
      ))}

      {/* New Tab button */}
      <button
        className="no-drag"
        onClick={() => dispatch({ type: 'TAB_NEW', payload: { workspaceId: activeWorkspaceId } })}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--veil-glass-border)',
          borderRadius: 'var(--radius-tab)',
          color: 'var(--veil-text-muted)',
          cursor: 'pointer',
          padding: '6px 8px',
          flexShrink: 0,
        }}
      >
        <Plus size={13} />
      </button>
    </div>
  )
}
