import React from 'react';

export const TitleBar: React.FC = () => {
  const handleMinimize = async () => {
    try { await window.veil?.minimize(); } catch (e) { console.error('[TitleBar] Minimize:', e); }
  };

  const handleMaximize = async () => {
    try { await window.veil?.maximize(); } catch (e) { console.error('[TitleBar] Maximize:', e); }
  };

  const handleClose = async () => {
    try { await window.veil?.close(); } catch (e) { console.error('[TitleBar] Close:', e); }
  };

  const handleKeyDown = (handler: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
  };

  const btnStyle: React.CSSProperties = {
    width: '46px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '10px',
    transition: 'background 100ms ease-out',
  };

  return (
    <div
      className="title-bar drag"
      style={{
        height: 'var(--title-bar-height)',
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-toolbar)',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      <div style={{ flex: 1 }} />
      <div
        className="window-controls no-drag"
        style={{ display: 'flex' }}
      >
        <button
          aria-label="Minimize"
          onClick={handleMinimize}
          onKeyDown={handleKeyDown(handleMinimize)}
          style={btnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor" /></svg>
        </button>
        <button
          aria-label="Maximize"
          onClick={handleMaximize}
          onKeyDown={handleKeyDown(handleMaximize)}
          style={btnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        </button>
        <button
          aria-label="Close"
          onClick={handleClose}
          onKeyDown={handleKeyDown(handleClose)}
          style={btnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#E81123'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10" />
            <line x1="10" y1="0" x2="0" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
};
