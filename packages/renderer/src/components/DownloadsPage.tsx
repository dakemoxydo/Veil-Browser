import React, { useMemo } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { DownloadItem } from '@veil/shared';
import { EmptyState } from './EmptyState';

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const statusLabels: Record<DownloadItem['state'], { label: string; color: string }> = {
  progressing: { label: 'Downloading', color: 'var(--accent)' },
  completed: { label: 'Completed', color: 'var(--success, #22c55e)' },
  cancelled: { label: 'Cancelled', color: 'var(--text-muted)' },
  interrupted: { label: 'Interrupted', color: 'var(--danger)' },
};

export const DownloadsPage: React.FC = React.memo(() => {
  const downloads = useVeilStore((s) => s.downloads);
  const dispatch = useVeilStore((s) => s.dispatch);

  const sorted = useMemo(
    () => [...downloads].sort((a, b) => b.startTime - a.startTime),
    [downloads]
  );

  const handleOpen = (id: string) => {
    dispatch({ type: 'DOWNLOAD_OPEN', payload: { id } });
  };

  const handleShowInFolder = (id: string) => {
    dispatch({ type: 'DOWNLOAD_SHOW_IN_FOLDER', payload: { id } });
  };

  const handleCancel = (id: string) => {
    dispatch({ type: 'DOWNLOAD_CANCEL', payload: { id } });
  };

  const handleClearHistory = () => {
    dispatch({ type: 'DOWNLOAD_CLEAR_HISTORY' });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
      {/* Header */}
      <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Downloads</h1>
          {downloads.length > 0 && (
            <button onClick={handleClearHistory} style={clearBtnStyle}>
              Clear history
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 40px' }}>
        {sorted.length === 0 ? (
          <EmptyState
            icon='<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
            title="No downloads yet"
            description="Files you download will appear here"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sorted.map((dl) => (
              <DownloadRow
                key={dl.id}
                download={dl}
                onOpen={handleOpen}
                onShowInFolder={handleShowInFolder}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

const DownloadRow: React.FC<{
  download: DownloadItem;
  onOpen: (id: string) => void;
  onShowInFolder: (id: string) => void;
  onCancel: (id: string) => void;
}> = ({ download, onOpen, onShowInFolder, onCancel }) => {
  const status = statusLabels[download.state];
  const progress = download.totalBytes > 0
    ? Math.round((download.receivedBytes / download.totalBytes) * 100)
    : -1;

  return (
    <div
      style={{
        padding: '12px 16px',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-sm, 6px)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2, 8px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3, 12px)' }}>
        <span
          style={{
            fontSize: 'var(--font-size-sm, 13px)',
            fontWeight: 500,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {download.filename}
        </span>
        <span
          style={{
            fontSize: 'var(--font-size-xs, 11px)',
            color: status.color,
            flexShrink: 0,
          }}
        >
          {status.label}
          {download.state === 'progressing' && download.totalBytes > 0 && (
            <span> &middot; {progress}%</span>
          )}
        </span>
      </div>

      {/* Progress bar */}
      {download.state === 'progressing' && (
        <div style={{ height: '4px', background: 'var(--bg-active)', borderRadius: '2px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: download.totalBytes > 0 ? `${progress}%` : '30%',
              background: 'var(--accent)',
              borderRadius: '2px',
              transition: 'width 0.3s',
              ...(download.totalBytes <= 0 ? { animation: 'download-indeterminate 1.5s ease-in-out infinite' } : {}),
            }}
          />
        </div>
      )}

      {/* Size info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 'var(--font-size-xs, 11px)', color: 'var(--text-muted)' }}>
          {download.state === 'progressing'
            ? `${formatBytes(download.receivedBytes)}${download.totalBytes > 0 ? ` / ${formatBytes(download.totalBytes)}` : ''}`
            : download.state === 'completed'
            ? formatBytes(download.totalBytes)
            : download.state}
        </span>
        <span style={{ fontSize: 'var(--font-size-xs, 11px)', color: 'var(--text-muted)' }}>
          {new Date(download.startTime).toLocaleString()}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 'var(--space-1, 4px)' }}>
        {download.state === 'completed' && (
          <button onClick={() => onOpen(download.id)} style={actionBtnStyle}>
            Open
          </button>
        )}
        <button onClick={() => onShowInFolder(download.id)} style={actionBtnStyle}>
          Show in folder
        </button>
        {download.state === 'progressing' && (
          <button onClick={() => onCancel(download.id)} style={{ ...actionBtnStyle, color: 'var(--danger)' }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

const actionBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm, 6px)',
  color: 'var(--text-secondary)',
  fontSize: 'var(--font-size-xs, 11px)',
  padding: '4px 10px',
  cursor: 'pointer',
  transition: 'background 100ms ease-out',
};

const clearBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'rgba(255, 255, 255, 0.05)',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  cursor: 'pointer',
};

// Inject indeterminate animation once
if (typeof document !== 'undefined' && !document.getElementById('download-indeterminate-keyframes')) {
  const style = document.createElement('style');
  style.id = 'download-indeterminate-keyframes';
  style.textContent = `
    @keyframes download-indeterminate {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
  `;
  document.head.appendChild(style);
}
