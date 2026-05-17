import React, { useState, useEffect, useRef } from 'react';
import { useVeilStore } from '../store/useVeilStore';

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const DownloadPanel: React.FC = () => {
  const downloads = useVeilStore((s) => s.downloads);
  const dispatch = useVeilStore((s) => s.dispatch);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (downloads.length === 0) return null;

  const activeDownloads = downloads.filter(d => d.state === 'progressing');
  const recentDownloads = downloads.slice(0, 5);

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        className="toolbar-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Downloads"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        style={{
          color: activeDownloads.length > 0 ? 'var(--accent)' : 'var(--text-secondary)',
          position: 'relative',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {activeDownloads.length > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent)',
            }}
          />
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="dropdown-menu"
          style={{
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: 'var(--space-2)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-primary)',
              padding: 'var(--space-2) var(--space-3)',
              borderBottom: '1px solid var(--border-light)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Downloads
          </div>
          {recentDownloads.map((download) => (
            <div
              key={download.id}
              role="menuitem"
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {download.filename}
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginLeft: 'var(--space-2)' }}>
                  {download.state === 'completed'
                    ? formatBytes(download.totalBytes)
                    : download.state === 'progressing'
                    ? `${formatBytes(download.receivedBytes)} / ${formatBytes(download.totalBytes)}`
                    : download.state}
                </span>
              </div>

              {download.state === 'progressing' && (
                <div style={{ height: '3px', background: 'var(--bg-active)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${download.totalBytes > 0 ? (download.receivedBytes / download.totalBytes) * 100 : 0}%`,
                      background: 'var(--accent)',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                {download.state === 'completed' && (
                  <button
                    onClick={() => dispatch({ type: 'DOWNLOAD_OPEN', payload: { id: download.id } })}
                    style={actionBtnStyle}
                  >
                    Open
                  </button>
                )}
                <button
                  onClick={() => dispatch({ type: 'DOWNLOAD_SHOW_IN_FOLDER', payload: { id: download.id } })}
                  style={actionBtnStyle}
                >
                  Folder
                </button>
                {download.state === 'progressing' && (
                  <button
                    onClick={() => dispatch({ type: 'DOWNLOAD_CANCEL', payload: { id: download.id } })}
                    style={{ ...actionBtnStyle, color: '#E81123' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-xs)',
  padding: '2px 8px',
  cursor: 'pointer',
  transition: 'background 100ms ease-out',
};
