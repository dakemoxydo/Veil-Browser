import React, { useMemo } from 'react';
import { useVeilStore } from '../store/useVeilStore';

export const StatusBar: React.FC = () => {
  const tabs = useVeilStore((s) => s.tabs);
  const activeTabId = useVeilStore((s) => s.activeTabId);
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const isLoading = activeTab?.isLoading ?? false;

  return (
    <div className="status-bar">
      {isLoading && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading...
        </span>
      )}
      <span style={{ flex: 1 }} />
      <span>{activeTab?.url || ''}</span>
    </div>
  );
};
