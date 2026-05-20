import React, { useEffect, useRef, useState } from 'react';
import { useVeilStore, selectActiveTab } from '../store/useVeilStore';
import { TabBar } from './TabBar';
import { AddressBar } from './AddressBar';
import { BookmarkBar } from './BookmarkBar';
import { StatusBar } from './StatusBar';
import { HomePage } from './HomePage';
import { DebugPanel } from './DebugPanel';
import { SettingsPage } from './SettingsPage';
import { HistoryPage } from './HistoryPage';
import { VersionPage } from './VersionPage';
import { FindBar } from './FindBar';
import { ErrorBoundary } from './ErrorBoundary';
import { BookmarksPage } from './BookmarksPage';
import { DownloadsPage } from './DownloadsPage';
import { PrivacyDashboard } from './PrivacyDashboard';
import { ShortcutsPage } from './ShortcutsPage';
import { ToastContainer } from './ToastContainer';
import { TabSearchOverlay } from './TabSearchOverlay';
import { PasswordManager } from './PasswordManager';

export const VeilShell: React.FC = () => {
  const showBookmarksBar = useVeilStore((s) => s.settings.appearance.showBookmarksBar);
  const theme = useVeilStore((s) => s.settings.appearance.theme);
  const fontSize = useVeilStore((s) => s.settings.appearance.fontSize);
  const compactMode = useVeilStore((s) => s.settings.appearance.compactMode);
  const accentColor = useVeilStore((s) => s.settings.appearance.accentColor);
  const tabCount = useVeilStore((s) => s.tabs.length);
  const activeTab = useVeilStore(selectActiveTab);
  const dispatch = useVeilStore((s) => s.dispatch);
  const currentView = useVeilStore((s) => s.currentView);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInternalPage = activeTab?.url?.startsWith('veil://') ?? false;
  const [showFindBar, setShowFindBar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTabSearch, setShowTabSearch] = useState(false);

  // Listen for keyboard shortcuts from main process
  useEffect(() => {
    if (!window.veil?.onShortcut) return;
    const cleanup = window.veil.onShortcut((shortcut) => {
      const currentTabId = useVeilStore.getState().activeTabId;
      switch (shortcut) {
        case 'new-tab':
          dispatch({ type: 'TAB_NEW', payload: {} });
          break;
        case 'close-tab':
          if (currentTabId) {
            dispatch({ type: 'TAB_CLOSE', payload: { id: currentTabId } });
          }
          break;
        case 'reload':
          if (currentTabId) {
            dispatch({ type: 'TAB_RELOAD', payload: { id: currentTabId } });
          }
          break;
        case 'search': {
          const input = document.querySelector<HTMLInputElement>('.address-bar-container input');
          if (input) {
            input.focus();
            input.select();
          }
          break;
        }
        case 'debug':
          useVeilStore.getState().toggleDebugPanel();
          break;
        case 'find-in-page':
          setShowFindBar(true);
          break;
        case 'next-tab': {
          const state = useVeilStore.getState();
          const idx = state.tabs.findIndex(t => t.id === state.activeTabId);
          if (state.tabs.length > 1) {
            const next = state.tabs[(idx + 1) % state.tabs.length];
            dispatch({ type: 'TAB_FOCUS', payload: { id: next.id } });
          }
          break;
        }
        case 'prev-tab': {
          const state = useVeilStore.getState();
          const idx = state.tabs.findIndex(t => t.id === state.activeTabId);
          if (state.tabs.length > 1) {
            const prev = state.tabs[(idx - 1 + state.tabs.length) % state.tabs.length];
            dispatch({ type: 'TAB_FOCUS', payload: { id: prev.id } });
          }
          break;
        }
        case 'restore-tab': {
          dispatch({ type: 'TAB_RESTORE' });
          break;
        }
        case 'bookmark': {
          const bmState = useVeilStore.getState();
          const bmTab = bmState.tabs.find(t => t.id === bmState.activeTabId);
          if (bmTab && bmTab.url && !bmTab.url.startsWith('veil://')) {
            dispatch({ type: 'BOOKMARK_ADD', payload: { url: bmTab.url, title: bmTab.title || bmTab.url } });
          }
          break;
        }
        case 'focus-address-bar': {
          const input = document.querySelector('.omnibox input') as HTMLInputElement | null;
          input?.focus();
          input?.select();
          break;
        }
        case 'history': {
          const state = useVeilStore.getState();
          if (state.activeTabId) {
            dispatch({ type: 'TAB_NAVIGATE', payload: { id: state.activeTabId, url: 'veil://history' } });
          } else {
            dispatch({ type: 'TAB_NEW', payload: { url: 'veil://history' } });
          }
          break;
        }
        case 'downloads': {
          useVeilStore.getState().toggleDownloadPanel();
          break;
        }
        case 'tab-search': {
          setShowTabSearch(true);
          break;
        }
      }
    });
    return cleanup;
  }, [dispatch]);

  // Hide/show WebContentsViews when switching between browser and settings
  useEffect(() => {
    if (window.veil?.setViewMode) {
      window.veil.setViewMode(currentView);
    }
  }, [currentView]);

  // Listen for fullscreen changes
  useEffect(() => {
    if (!window.veil?.onFullscreenChange) return;
    return window.veil.onFullscreenChange(setIsFullscreen);
  }, []);

  // Listen for zoom changes
  useEffect(() => {
    if (!window.veil?.onZoomChange) return;
    return window.veil.onZoomChange((level) => {
      useVeilStore.setState({ zoomLevel: level });
    });
  }, []);

  // System theme detection
  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => {
      document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
    };
    applySystemTheme();
    mediaQuery.addEventListener('change', applySystemTheme);
    return () => mediaQuery.removeEventListener('change', applySystemTheme);
  }, [theme]);

  // Update shell offset for ViewManager positioning (debounced)
  useEffect(() => {
    let rafId: number | null = null;
    const updateOffset = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (containerRef.current && window.veil) {
          const rect = containerRef.current.getBoundingClientRect();
          window.veil.setShellOffset(Math.floor(rect.top));
        }
      });
    };

    updateOffset();

    const observer = new ResizeObserver(updateOffset);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', updateOffset);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', updateOffset);
    };
  }, [showBookmarksBar]);

  const resolvedTheme = theme === 'system' ? undefined : theme;

  return (
    <div
      className="veil-shell"
      data-theme={resolvedTheme}
      data-font-size={fontSize !== 'medium' ? fontSize : undefined}
      data-compact={compactMode ? 'true' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--bg-app)',
        '--accent': accentColor,
        '--accent-hover': accentColor,
        '--accent-focus': `${accentColor}33`,
      } as React.CSSProperties}
    >
      <a href="#browser-view-container" className="sr-only" style={{position:'absolute',left:'-9999px'}}>Skip to content</a>
      {!isFullscreen && (
      <header role="banner" className="glass">
        <div style={{ flexShrink: 0 }}>
          <ErrorBoundary name="TabBar">
            <TabBar />
          </ErrorBoundary>
        </div>
        <div style={{ flexShrink: 0 }}>
          <ErrorBoundary name="AddressBar">
            <AddressBar />
          </ErrorBoundary>
        </div>
        {showBookmarksBar && (
          <div style={{ flexShrink: 0 }}>
            <ErrorBoundary name="BookmarkBar">
              <BookmarkBar />
            </ErrorBoundary>
          </div>
        )}
      </header>
      )}
      <main
        role="main"
        ref={containerRef}
        id="browser-view-container"
        style={{
          flex: 1,
          background: 'var(--bg-surface)',
          overflow: currentView === 'settings' ? 'auto' : 'hidden',
          position: 'relative',
        }}
      >
        {currentView === 'settings' ? (
          <ErrorBoundary name="Settings">
            <SettingsPage />
          </ErrorBoundary>
        ) : activeTab?.url === 'veil://history' ? (
          <ErrorBoundary name="History">
            <HistoryPage />
          </ErrorBoundary>
        ) : activeTab?.url === 'veil://version' ? (
          <ErrorBoundary name="Version">
            <VersionPage />
          </ErrorBoundary>
        ) : activeTab?.url === 'veil://bookmarks' ? (
          <ErrorBoundary name="Bookmarks">
            <BookmarksPage />
          </ErrorBoundary>
        ) : activeTab?.url === 'veil://downloads' ? (
          <ErrorBoundary name="Downloads">
            <DownloadsPage />
          </ErrorBoundary>
        ) : activeTab?.url === 'veil://privacy' ? (
          <ErrorBoundary name="Privacy">
            <PrivacyDashboard />
          </ErrorBoundary>
        ) : activeTab?.url === 'veil://shortcuts' ? (
          <ErrorBoundary name="Shortcuts">
            <ShortcutsPage />
          </ErrorBoundary>
        ) : activeTab?.url === 'veil://passwords' ? (
          <ErrorBoundary name="PasswordManager">
            <PasswordManager />
          </ErrorBoundary>
        ) : (tabCount === 0 || isInternalPage) ? (
          <ErrorBoundary name="HomePage">
            <HomePage />
          </ErrorBoundary>
        ) : null}
        {showFindBar && currentView !== 'settings' && !isInternalPage && (
          <ErrorBoundary name="FindBar">
            <FindBar onClose={() => setShowFindBar(false)} />
          </ErrorBoundary>
        )}
      </main>
      {!isFullscreen && (
      <div style={{ flexShrink: 0 }}>
        <ErrorBoundary name="StatusBar">
          <StatusBar />
        </ErrorBoundary>
      </div>
      )}
      <ErrorBoundary name="DebugPanel">
        <DebugPanel />
      </ErrorBoundary>
      <ToastContainer />
      {showTabSearch && <TabSearchOverlay onClose={() => setShowTabSearch(false)} />}
    </div>
  );
};
