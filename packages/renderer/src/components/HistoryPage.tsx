import React, { useState, useEffect } from 'react';
import { HistoryEntry } from '@veil/shared';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { ConfirmDialog } from './ConfirmDialog';

export const HistoryPage: React.FC = React.memo(() => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await window.veil?.historyList?.();
        if (data?.entries) setEntries(data.entries);
      } catch { /* history not available */ }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = search
    ? entries.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.url.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const grouped = groupByDate(filtered);

  const handleClear = async () => {
    await window.veil?.historyClear?.();
    setEntries([]);
  };

  const handleNavigate = async (url: string) => {
    const state = await window.veil?.getState?.();
    const activeTabId = state?.activeTabId;
    if (activeTabId) {
      window.veil?.dispatch?.({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url } });
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
      {/* Header */}
      <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>History</h1>
          <button onClick={() => setShowClearConfirm(true)} style={clearBtnStyle}>Clear all history</button>
        </div>
        <input
          type="text"
          placeholder="Search history..."
          aria-label="Search history"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="settings-input"
          style={{ maxWidth: '400px' }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 40px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Skeleton width="16px" height="16px" borderRadius="50%" />
                <Skeleton width={`${60 + Math.random() * 30}%`} height="14px" />
                <Skeleton width="50px" height="11px" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon='<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
            title={search ? 'No matching entries' : 'No history yet'}
            description={search ? 'Try a different search term' : 'Your browsing history will appear here'}
          />
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                {date}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {items.map((entry) => (
                  <div
                    key={entry.id}
                    role="link"
                    tabIndex={0}
                    aria-label={entry.title || entry.url}
                    className="history-entry"
                    onClick={() => handleNavigate(entry.url)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNavigate(entry.url);
                      }
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.title || entry.url}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      {showClearConfirm && (
        <ConfirmDialog
          title="Clear all history"
          message="This will permanently delete all browsing history. This action cannot be undone."
          confirmLabel="Clear all"
          variant="danger"
          onConfirm={() => { setShowClearConfirm(false); handleClear(); }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
});

function groupByDate(entries: HistoryEntry[]): Record<string, HistoryEntry[]> {
  const groups: Record<string, HistoryEntry[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const entry of entries) {
    const dateStr = new Date(entry.timestamp).toDateString();
    let label: string;
    if (dateStr === today) label = 'Today';
    else if (dateStr === yesterday) label = 'Yesterday';
    else label = new Date(entry.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  }
  return groups;
}

const clearBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--danger)',
  fontSize: '13px',
  cursor: 'pointer',
};
