import React, { useState, useEffect } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { getSearchUrl } from '@veil/shared';

export const AddressBar: React.FC = () => {
  const [value, setValue] = useState('');
  const activeTab = useVeilStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const activeTabId = useVeilStore((s) => s.activeTabId);
  const settings = useVeilStore((s) => s.settings);
  const dispatch = useVeilStore((s) => s.dispatch);

  useEffect(() => {
    if (activeTab) {
      setValue(activeTab.url);
    }
  }, [activeTabId, activeTab?.url]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeTabId) {
      let url = value.trim();
      if (!url) return;
      const dangerous = ['file://', 'data:', 'javascript:', 'chrome://', 'chrome-extension://'];
      if (dangerous.some(prefix => url.toLowerCase().startsWith(prefix))) return;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url } });
      } else if (/^[\w-]+(\.[\w-]+)+/.test(url) && !url.includes(' ')) {
        dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url: `https://${url}` } });
      } else {
        dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url: getSearchUrl(url, settings.general.searchEngine, settings.general.customSearchUrl) } });
      }
    }
  };

  const handleBack = () => {
    if (activeTabId && activeTab?.canGoBack) {
      dispatch({ type: 'TAB_GO_BACK', payload: { id: activeTabId } });
    }
  };

  const handleForward = () => {
    if (activeTabId && activeTab?.canGoForward) {
      dispatch({ type: 'TAB_GO_FORWARD', payload: { id: activeTabId } });
    }
  };

  const handleReload = () => {
    if (activeTabId) {
      dispatch({ type: 'TAB_RELOAD', payload: { id: activeTabId } });
    }
  };

  const handleHome = () => {
    if (activeTabId) {
      dispatch({ type: 'TAB_GO_HOME', payload: { id: activeTabId } });
    }
  };

  const isLoading = activeTab?.isLoading ?? false;

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="address-bar-container no-drag"
        style={{
          padding: '6px 8px',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          minHeight: 'var(--toolbar-height)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <button
          className="nav-btn"
          onClick={handleBack}
          disabled={!activeTab?.canGoBack}
          aria-label="Go back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          className="nav-btn"
          onClick={handleForward}
          disabled={!activeTab?.canGoForward}
          aria-label="Go forward"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <button
          className="nav-btn"
          onClick={handleReload}
          aria-label={isLoading ? 'Stop' : 'Reload'}
        >
          {isLoading ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          )}
        </button>
        <button
          className="nav-btn"
          onClick={handleHome}
          aria-label="Home"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            height: 'var(--omnibox-height)',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border)',
            background: 'var(--bg-input)',
            padding: '0 var(--space-3)',
            gap: 'var(--space-2)',
            transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            {activeTab?.url.startsWith('https') ? (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="8" />
              </>
            )}
          </svg>
          <input
            type="text"
            placeholder="Search or enter URL"
            aria-label="Address bar"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              e.currentTarget.parentElement?.style.setProperty('border-color', 'transparent');
              e.currentTarget.parentElement?.style.setProperty('box-shadow', '0 0 0 2px var(--accent-focus)');
            }}
            onBlur={(e) => {
              e.currentTarget.parentElement?.style.setProperty('border-color', 'var(--border)');
              e.currentTarget.parentElement?.style.setProperty('box-shadow', 'none');
            }}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-base)',
              height: '100%',
            }}
          />
        </div>

        <button className="toolbar-btn" aria-label="Bookmark this page">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        <button className="toolbar-btn" aria-label="Menu" style={{ position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {isLoading && (
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${activeTab?.loadProgress ?? 0}%` }}
          />
        </div>
      )}
    </div>
  );
};
