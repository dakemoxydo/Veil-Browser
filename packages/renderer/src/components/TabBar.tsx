import React from 'react';
import { useVeilStore } from '../store/useVeilStore';

export const TabBar: React.FC = () => {
  const tabs = useVeilStore((s) => s.tabs);
  const activeTabId = useVeilStore((s) => s.activeTabId);
  const dispatch = useVeilStore((s) => s.dispatch);

  const handleTabKeyDown = (tabId: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dispatch({ type: 'TAB_FOCUS', payload: { id: tabId } });
    }
  };

  const handleCloseKeyDown = (tabId: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: 'TAB_CLOSE', payload: { id: tabId } });
    }
  };

  const handleMinimize = async () => {
    try { await window.veil?.minimize(); } catch (e) { console.error('[TabBar] Minimize:', e); }
  };

  const handleMaximize = async () => {
    try { await window.veil?.maximize(); } catch (e) { console.error('[TabBar] Maximize:', e); }
  };

  const handleClose = async () => {
    try { await window.veil?.close(); } catch (e) { console.error('[TabBar] Close:', e); }
  };

  const winBtnStyle: React.CSSProperties = {
    width: '46px',
    height: '100%',
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
      className="tab-bar-container"
      role="tablist"
      style={{
        display: 'flex',
        background: 'var(--bg-toolbar)',
        minHeight: 'calc(var(--tab-height) + 6px)',
        boxSizing: 'border-box',
        alignItems: 'stretch',
      }}
    >
      {/* Tabs area — inherits drag from parent, tabs are no-drag */}
      <div
        className="no-drag"
        style={{
          flex: 1,
          display: 'flex',
          gap: '1px',
          padding: '6px 8px 0',
          overflowX: 'auto',
          overflowY: 'hidden',
          alignItems: 'flex-end',
          scrollbarWidth: 'none',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              aria-label={tab.title}
              className={`tab-item ${isActive ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'TAB_FOCUS', payload: { id: tab.id } })}
              onKeyDown={handleTabKeyDown(tab.id)}
            >
              {tab.favicon ? (
                <img
                  src={tab.favicon}
                  alt=""
                  style={{ width: '16px', height: '16px', marginRight: '8px', flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '8px',
                    borderRadius: '50%',
                    background: 'var(--bg-active)',
                    flexShrink: 0,
                  }}
                />
              )}
              <div
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  fontSize: 'var(--font-size-base)',
                }}
              >
                {tab.title}
              </div>
              <div
                className="close-btn"
                role="button"
                tabIndex={0}
                aria-label={`Close ${tab.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'TAB_CLOSE', payload: { id: tab.id } });
                }}
                onKeyDown={handleCloseKeyDown(tab.id)}
              >
                &times;
              </div>
            </div>
          );
        })}
        <button
          className="toolbar-btn"
          aria-label="New tab"
          onClick={() => dispatch({ type: 'TAB_NEW', payload: {} })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              dispatch({ type: 'TAB_NEW', payload: {} });
            }
          }}
          style={{
            width: '28px',
            height: '28px',
            margin: '0 4px 4px',
            fontSize: '18px',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          +
        </button>
      </div>

      {/* Window controls */}
      <div
        className="no-drag"
        style={{ display: 'flex', flexShrink: 0, alignSelf: 'stretch' }}
      >
        <button
          aria-label="Minimize"
          onClick={handleMinimize}
          style={winBtnStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor" /></svg>
        </button>
        <button
          aria-label="Maximize"
          onClick={handleMaximize}
          style={winBtnStyle}
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
          style={winBtnStyle}
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
