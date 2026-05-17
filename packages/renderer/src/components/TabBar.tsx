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

  return (
    <div
      className="tab-bar-container no-drag"
      role="tablist"
      style={{
        display: 'flex',
        gap: '1px',
        padding: '6px 8px 0',
        overflowX: 'auto',
        overflowY: 'hidden',
        background: 'var(--bg-toolbar)',
        minHeight: 'calc(var(--tab-height) + 6px)',
        boxSizing: 'border-box',
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
        }}
      >
        +
      </button>
    </div>
  );
};
