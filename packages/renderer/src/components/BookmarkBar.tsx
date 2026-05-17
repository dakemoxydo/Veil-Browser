import React, { useMemo } from 'react';
import { useVeilStore } from '../store/useVeilStore';

export const BookmarkBar: React.FC = () => {
  const bookmarks = useVeilStore((s) => s.bookmarks);
  const dispatch = useVeilStore((s) => s.dispatch);
  const tabs = useVeilStore((s) => s.tabs);
  const activeTabId = useVeilStore((s) => s.activeTabId);
  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
  const settings = useVeilStore((s) => s.settings);

  if (!settings.appearance.showBookmarksBar || bookmarks.length === 0) return null;

  const handleBookmarkClick = (url: string) => {
    if (activeTab) {
      dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTab.id, url } });
    }
  };

  const isCurrentBookmarked = activeTab ? bookmarks.some(b => b.url === activeTab.url) : false;

  return (
    <div
      className="no-drag"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '4px 8px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-light)',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        minHeight: 'var(--bookmark-bar-height)',
        boxSizing: 'border-box',
      }}
    >
      {activeTab && (
        <button
          onClick={() => {
            if (isCurrentBookmarked) {
              const bookmark = bookmarks.find(b => b.url === activeTab.url);
              if (bookmark) dispatch({ type: 'BOOKMARK_REMOVE', payload: { id: bookmark.id } });
            } else {
              dispatch({ type: 'BOOKMARK_ADD', payload: { url: activeTab.url, title: activeTab.title } });
            }
          }}
          aria-label={isCurrentBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: 'var(--radius-sm)',
            color: isCurrentBookmarked ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '14px',
            flexShrink: 0,
            transition: 'background 100ms ease-out',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {isCurrentBookmarked ? '\u2605' : '\u2606'}
        </button>
      )}

      {bookmarks.slice(0, 20).map((bookmark) => (
        <button
          key={bookmark.id}
          onClick={() => handleBookmarkClick(bookmark.url)}
          aria-label={bookmark.title}
          className="bookmark-item"
        >
          <span
            style={{
              width: '16px',
              height: '16px',
              borderRadius: 'var(--radius-sm)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              background: 'var(--bg-active)',
              color: 'var(--text-secondary)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            {bookmark.favicon ? (
              <img src={bookmark.favicon} alt="" style={{ width: '16px', height: '16px', borderRadius: 'var(--radius-sm)' }} />
            ) : (
              (bookmark.title[0] || '?').toUpperCase()
            )}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{bookmark.title}</span>
        </button>
      ))}
    </div>
  );
};
