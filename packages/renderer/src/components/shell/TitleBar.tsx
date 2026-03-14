
import { useIPC } from '../../hooks/useIPC'
import { useVeilStore } from '../../store/useVeilStore'
import { X, Minus, Square, Settings } from 'lucide-react'

interface TitleBarProps {
  onSettingsOpen: () => void
}

export function TitleBar({ onSettingsOpen }: TitleBarProps) {
  const { dispatch } = useIPC()
  const settings = useVeilStore(s => s.settings)

  // Apply CSS tokens from settings cleanly via a style tag
  const dynamicStyles = `:root {
    --veil-accent: ${settings.appearance.accentColor};
    --veil-blur: ${settings.appearance.blurStrength}px;
  }`;

  return (
    <>
      <style>{dynamicStyles}</style>
      <div
        className="window-drag"
        style={{
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          userSelect: 'none',
        }}
      >
      {/* Left: Veil logo + settings */}
      <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="window-drag" style={{ fontWeight: 700, fontSize: '14px', color: 'var(--veil-accent)', letterSpacing: '-0.3px', paddingRight: '4px' }}>
          Veil
        </span>
        <button
          id="settings-btn"
          className="settings-btn no-drag"
          onClick={onSettingsOpen}
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Right: Window controls */}
      <div className="no-drag" style={{ display: 'flex', gap: '4px' }}>
        <WinBtn onClick={() => dispatch({ type: 'WINDOW_MINIMIZE' })} id="btn-minimize">
          <Minus size={13} />
        </WinBtn>
        <WinBtn onClick={() => dispatch({ type: 'WINDOW_MAXIMIZE' })} id="btn-maximize">
          <Square size={11} />
        </WinBtn>
        <WinBtn onClick={() => dispatch({ type: 'WINDOW_CLOSE' })} id="btn-close" danger>
          <X size={15} />
        </WinBtn>
      </div>
      </div>
    </>
  )
}

function WinBtn({ children, onClick, id, danger }: { children: React.ReactNode; onClick: () => void; id: string; danger?: boolean }) {
  return (
    <button
      id={id}
      className={`win-btn ${danger ? 'danger' : ''} no-drag`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

