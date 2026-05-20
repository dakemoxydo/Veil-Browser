import React, { useState, useMemo } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { BookmarkItem } from '@veil/shared';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

export const BookmarksPage: React.FC = React.memo(() => {
  const bookmarks = useVeilStore((s) => s.bookmarks);
  const dispatch = useVeilStore((s) => s.dispatch);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return bookmarks;
    const q = search.toLowerCase();
    return bookmarks.filter(
      (b) => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q)
    );
  }, [bookmarks, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, BookmarkItem[]> = {};
    for (const bm of filtered) {
      const folder = bm.folder || 'Uncategorized';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(bm);
    }
    return groups;
  }, [filtered]);

  const handleNavigate = async (url: string) => {
    const state = await window.veil?.getState?.();
    const activeTabId = state?.activeTabId;
    if (activeTabId) {
      dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url } });
    }
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'BOOKMARK_REMOVE', payload: { id } });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
      {/* Header */}
      <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid var(--border-light)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 16px' }}>Bookmarks</h1>
        <input
          type="text"
          placeholder="Search bookmarks..."
          aria-label="Search bookmarks"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="settings-input"
          style={{ maxWidth: '400px' }}
        />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 40px' }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon='<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
            title={search ? 'No matching bookmarks' : 'No bookmarks yet'}
            description={search ? 'Try a different search term' : 'Save your favorite pages for quick access'}
          />
        ) : (
          Object.entries(grouped).map(([folder, items]) => (
            <div key={folder} style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 8px',
                }}
              >
                {folder}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {items.map((bm) => (
                  <BookmarkRow
                    key={bm.id}
                    bookmark={bm}
                    onNavigate={handleNavigate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

const BookmarkRow: React.FC<{
  bookmark: BookmarkItem;
  onNavigate: (url: string) => void;
  onDelete: (id: string) => void;
}> = ({ bookmark, onNavigate, onDelete }) => {
  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={bookmark.title || bookmark.url}
      className="history-entry"
      onClick={() => onNavigate(bookmark.url)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(bookmark.url);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2, 8px)',
      }}
    >
      {bookmark.favicon ? (
        <img
          src={bookmark.favicon}
          alt=""
          width={16}
          height={16}
          style={{ borderRadius: '2px', flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '2px',
            background: 'var(--bg-hover)',
            flexShrink: 0,
          }}
        />
      )}
      <span
        style={{
          fontSize: '13px',
          fontWeight: 500,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {bookmark.title || bookmark.url}
      </span>
      <span
        style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          flexShrink: 0,
          maxWidth: '200px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {bookmark.url}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(bookmark.id);
        }}
        aria-label={`Delete bookmark ${bookmark.title}`}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm, 6px)',
          color: 'var(--danger)',
          fontSize: 'var(--font-size-xs, 11px)',
          padding: '2px 8px',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 100ms ease-out',
        }}
      >
        Delete
      </button>
    </div>
  );
};
