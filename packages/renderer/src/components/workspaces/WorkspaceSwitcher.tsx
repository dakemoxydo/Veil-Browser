import { Briefcase, Gamepad2, BookOpen } from 'lucide-react'
import { useVeilStore } from '../../store/useVeilStore'
import { useIPC } from '../../hooks/useIPC'

const WORKSPACE_ICONS: Record<string, React.ReactNode> = {
  work:   <Briefcase size={14} />,
  gaming: <Gamepad2 size={14} />,
  study:  <BookOpen size={14} />,
}

/**
 * WorkspaceSwitcher — compact pill bar for switching workspace contexts.
 * Each workspace can have its own accent color and active extensions.
 */
export function WorkspaceSwitcher() {
  const workspaces = useVeilStore(s => s.workspaces)
  const activeWorkspaceId = useVeilStore(s => s.activeWorkspaceId)
  const { dispatch } = useIPC()

  if (workspaces.length === 0) return null

  return (
    <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 12px 8px' }}>
      {workspaces.map(ws => (
        <button
          key={ws.id}
          onClick={() => dispatch({ type: 'WORKSPACE_SWITCH', payload: { id: ws.id } })}
          title={ws.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid',
            borderColor: ws.id === activeWorkspaceId ? ws.accentColor : 'var(--veil-glass-border)',
            background: ws.id === activeWorkspaceId ? `${ws.accentColor}22` : 'transparent',
            color: ws.id === activeWorkspaceId ? ws.accentColor : 'var(--veil-text-muted)',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 200ms var(--veil-ease)',
            fontFamily: 'inherit',
          }}
        >
          {WORKSPACE_ICONS[ws.id] ?? ws.icon}
          <span>{ws.name}</span>
        </button>
      ))}
    </div>
  )
}
