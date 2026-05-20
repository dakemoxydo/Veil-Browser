import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVeilStore, selectActiveTab } from '../store/useVeilStore';
import { getSearchUrl, SuggestionItem } from '@veil/shared';
import { DownloadPanel } from './DownloadPanel';

export const AddressBar: React.FC = React.memo(() => {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const activeTab = useVeilStore(selectActiveTab);
  const activeTabId = useVeilStore((s) => s.activeTabId);
  const bookmarks = useVeilStore((s) => s.bookmarks);
  const searchEngine = useVeilStore((s) => s.settings.general.searchEngine);
  const customSearchUrl = useVeilStore((s) => s.settings.general.customSearchUrl);
  const dispatch = useVeilStore((s) => s.dispatch);
  const setView = useVeilStore((s) => s.setView);
  const isBookmarked = activeTab ? bookmarks.some(b => b.url === activeTab.url) : false;
  const lastSyncedUrl = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Sync URL from active tab to input value
  useEffect(() => {
    if (!activeTab) return;
    // Always sync on tab switch
    setValue(activeTab.url);
    lastSyncedUrl.current = activeTab.url;
  }, [activeTabId]);

  // Sync URL on in-tab navigation (only when not focused)
  useEffect(() => {
    if (!activeTab || isFocused) return;
    if (activeTab.url !== lastSyncedUrl.current) {
      setValue(activeTab.url);
      lastSyncedUrl.current = activeTab.url;
    }
  }, [activeTab?.url, isFocused]);

  // Debounced search for suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await window.veil.searchSuggestions(value.trim());
        setSuggestions(results);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

  const navigateTo = useCallback((url: string) => {
    if (!activeTabId) return;
    dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url } });
    setSuggestions([]);
    setSelectedIndex(-1);
  }, [activeTabId, dispatch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
      return;
    }
    if (e.key === 'Escape') {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }
    if (e.key === 'Enter' && activeTabId) {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        navigateTo(suggestions[selectedIndex].url);
        return;
      }
      const url = value.trim();
      if (!url) return;
      if (url.startsWith('veil://')) {
        dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url } });
      } else if (url.startsWith('http://') || url.startsWith('https://')) {
        dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url } });
      } else if (/^(?!.*\.\w{1,4}$)[\w-]+(\.[\w-]+)+\.[a-zA-Z]{2,}$/.test(url) && !url.includes(' ')) {
        dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url: `https://${url}` } });
      } else {
        dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url: getSearchUrl(url, searchEngine, customSearchUrl) } });
      }
      setSuggestions([]);
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
    setView('browser');
    if (activeTabId) {
      dispatch({ type: 'TAB_GO_HOME', payload: { id: activeTabId } });
    } else {
      dispatch({ type: 'TAB_NEW', payload: {} });
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
          className="omnibox"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
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
            aria-expanded={suggestions.length > 0 && isFocused}
            aria-controls="address-suggestions-listbox"
            aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
            aria-autocomplete="list"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
            }}
            onBlur={() => {
              setIsFocused(false);
              blurTimeoutRef.current = setTimeout(() => {
                setSuggestions([]);
                setSelectedIndex(-1);
              }, 150);
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

        <button
          className="toolbar-btn"
          aria-label="Bookmark this page"
          onClick={() => {
            if (activeTab) {
              dispatch({ type: 'BOOKMARK_ADD', payload: { url: activeTab.url, title: activeTab.title } });
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        <button
          className="toolbar-btn"
          aria-label="Toggle reader mode"
          onClick={async () => {
            try {
              await window.veil?.toggleReaderMode();
            } catch (e) {
              console.error('[AddressBar] toggleReaderMode:', e);
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </button>

        <DownloadPanel />
        <button
          className="toolbar-btn"
          aria-label="Incognito"
          onClick={() => window.veil?.openIncognito()}
          title="Incognito (Ctrl+Shift+N)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
        <button
          className="toolbar-btn"
          aria-label="Settings"
          onClick={() => useVeilStore.getState().setView(
            useVeilStore.getState().currentView === 'settings' ? 'browser' : 'settings'
          )}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {suggestions.length > 0 && isFocused && (
        <div
          className="suggestions-dropdown"
          ref={suggestionsRef}
          id="address-suggestions-listbox"
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
        >
          {suggestions.map((item, i) => (
            <div
              key={`${item.source}-${item.url}`}
              id={`suggestion-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={`suggestion-item${i === selectedIndex ? ' selected' : ''}`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => navigateTo(item.url)}
            >
              <div className="suggestion-icon">
                {item.source === 'bookmark' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                ) : (
                  <span className="suggestion-initial">{(item.title || item.url).charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="suggestion-content">
                <span className="suggestion-title">{item.title || item.url}</span>
                <span className="suggestion-url">{item.url}</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
});
