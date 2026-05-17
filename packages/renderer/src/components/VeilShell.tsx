import React, { useEffect, useRef } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { TitleBar } from './TitleBar';
import { TabBar } from './TabBar';
import { AddressBar } from './AddressBar';
import { BookmarkBar } from './BookmarkBar';
import { StatusBar } from './StatusBar';
import { HomePage } from './HomePage';
import { Sidebar } from './Sidebar';
import { DebugPanel } from './DebugPanel';
import { SettingsPage } from './SettingsPage';

export const VeilShell: React.FC = () => {
  const settings = useVeilStore((s) => s.settings);
  const tabs = useVeilStore((s) => s.tabs);
  const activeTabId = useVeilStore((s) => s.activeTabId);
  const dispatch = useVeilStore((s) => s.dispatch);
  const currentView = useVeilStore((s) => s.currentView);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen for keyboard shortcuts from main process
  useEffect(() => {
    if (!window.veil?.onShortcut) return;
    const cleanup = window.veil.onShortcut((shortcut) => {
      switch (shortcut) {
        case 'close-tab':
          if (activeTabId) {
            dispatch({ type: 'TAB_CLOSE', payload: { id: activeTabId } });
          }
          break;
        case 'reload':
          if (activeTabId) {
            dispatch({ type: 'TAB_RELOAD', payload: { id: activeTabId } });
          }
          break;
      }
    });
    return cleanup;
  }, [activeTabId, dispatch]);

  useEffect(() => {
    const updateOffset = () => {
      if (containerRef.current && window.veil) {
        const rect = containerRef.current.getBoundingClientRect();
        window.veil.setShellOffset(Math.floor(rect.top));
      }
    };

    updateOffset();

    const observer = new ResizeObserver(updateOffset);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', updateOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateOffset);
    };
  }, [settings.appearance.showBookmarksBar, settings.appearance.showSidebar]);

  return (
    <div
      className="veil-shell"
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--bg-app)',
      }}
    >
      {settings.appearance.showSidebar && <Sidebar />}
      <div
        className="main-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <TitleBar />
        </div>
        <div style={{ flexShrink: 0 }}>
          <TabBar />
        </div>
        <div style={{ flexShrink: 0 }}>
          <AddressBar />
        </div>
        <div style={{ flexShrink: 0 }}>
          <BookmarkBar />
        </div>
        <div
          ref={containerRef}
          id="browser-view-container"
          style={{
            flex: 1,
            background: 'var(--bg-surface)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {currentView === 'settings' ? (
            <SettingsPage />
          ) : tabs.length === 0 ? (
            <HomePage />
          ) : null}
        </div>
        <div style={{ flexShrink: 0 }}>
          <StatusBar />
        </div>
      </div>
      <DebugPanel />
    </div>
  );
};
