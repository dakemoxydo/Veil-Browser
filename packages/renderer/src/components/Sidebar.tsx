import React from 'react';
import { useVeilStore } from '../store/useVeilStore';

export const Sidebar: React.FC = () => {
  const tabs = useVeilStore((s) => s.tabs);
  const activeTabId = useVeilStore((s) => s.activeTabId);
  const dispatch = useVeilStore((s) => s.dispatch);

  return (
    <div
      className="sidebar no-drag"
      style={{
        width: '240px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-light)',
        padding: 'var(--space-3)',
        gap: 'var(--space-2)',
      }}
    >
      <div
        style={{
          padding: 'var(--space-3)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'var(--text-muted)',
          letterSpacing: '1px',
        }}
      >
        VEIL BROWSER
      </div>

      <div
        className="tab-list"
        role="tablist"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
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
              onClick={() => dispatch({ type: 'TAB_FOCUS', payload: { id: tab.id } })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  dispatch({ type: 'TAB_FOCUS', payload: { id: tab.id } });
                }
              }}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                fontSize: 'var(--font-size-base)',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-active)' : 'transparent',
                transition: 'background 100ms ease-out',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              {tab.favicon ? (
                <img
                  src={tab.favicon}
                  alt=""
                  style={{ width: '16px', height: '16px', borderRadius: '2px', flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'var(--bg-active)',
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
