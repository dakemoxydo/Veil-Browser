import React, { useState, useEffect } from 'react';
import { useVeilStore, selectActiveTab } from '../store/useVeilStore';

function zoomLevelToPercent(level: number): number {
  return Math.round(Math.pow(1.2, level) * 100);
}

export const StatusBar: React.FC = React.memo(() => {
  const activeTab = useVeilStore(selectActiveTab);
  const isLoading = activeTab?.isLoading ?? false;
  const privacyStats = useVeilStore((s) => s.privacyStats);
  const zoomLevel = useVeilStore((s) => s.zoomLevel);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  // Listen for link hover events from the main process
  useEffect(() => {
    if (!window.veil?.onLinkHover) return;
    const cleanup = window.veil.onLinkHover((url: string) => {
      setHoveredLink(url || null);
    });
    return cleanup;
  }, []);

  const isSecure = activeTab?.url?.startsWith('https://') ?? false;
  const blockedCount = privacyStats?.blockedCurrent ?? 0;

  return (
    <div className="status-bar" role="status" aria-live="polite">
      {/* Left side: loading + link hover */}
      {isLoading && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </span>
      )}
      {hoveredLink && (
        <span style={{ color: 'var(--text-muted)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '50%' }}>
          {hoveredLink}
        </span>
      )}

      <span style={{ flex: 1 }} />

      {/* Right side: privacy stats + security + URL */}
      {blockedCount > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontSize: '11px', marginRight: '8px' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {blockedCount} blocked
        </span>
      )}
      {zoomLevel !== 0 && (
        <span
          style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '11px', marginRight: '8px', cursor: 'pointer' }}
          onClick={() => window.veil?.setZoomLevel?.(0)}
          title="Click to reset zoom"
        >
          {zoomLevelToPercent(zoomLevel)}%
        </span>
      )}
      {activeTab?.url && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
          {isSecure ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-secure)" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
          )}
          <span style={{ color: 'var(--text-muted)' }}>{activeTab.url}</span>
        </span>
      )}
    </div>
  );
});
