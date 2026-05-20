import React, { useState, useRef, useEffect } from 'react';
import { useVeilStore, selectActiveTab } from '../store/useVeilStore';
import { BookmarkItem } from '@veil/shared';

export const BookmarkBar: React.FC = React.memo(() => {
  const bookmarks = useVeilStore((s) => s.bookmarks);
  const dispatch = useVeilStore((s) => s.dispatch);
  const activeTab = useVeilStore(selectActiveTab);
  const settings = useVeilStore((s) => s.settings);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const folderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openFolder) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (folderRef.current && !folderRef.current.contains(e.target as Node)) {
        setOpenFolder(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFolder]);

  if (!settings.appearance.showBookmarksBar || bookmarks.length === 0) return null;

  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  const handleBookmarkClick = (url: string) => {
    if (activeTab) {
      dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTab.id, url } });
    }
    setOpenFolder(null);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggedIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIdRef.current && draggedIdRef.current !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    const sourceId = draggedIdRef.current;
    draggedIdRef.current = null;
    if (sourceId && sourceId !== targetId) {
      dispatch({ type: 'BOOKMARK_REORDER', payload: { sourceId, targetId } });
    }
  };

  const handleDragEnd = () => {
    draggedIdRef.current = null;
    setDragOverId(null);
  };

  const isCurrentBookmarked = activeTab ? bookmarks.some(b => b.url === activeTab.url) : false;

  // Group bookmarks by folder
  const folders = new Map<string, BookmarkItem[]>();
  const noFolder: BookmarkItem[] = [];
  for (const bm of bookmarks) {
    if (bm.folder) {
      if (!folders.has(bm.folder)) folders.set(bm.folder, []);
      folders.get(bm.folder)!.push(bm);
    } else {
      noFolder.push(bm);
    }
  }

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
          type="button"
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

      {/* Folders */}
      {Array.from(folders.entries()).map(([folderName, items]) => (
        <div key={folderName} style={{ position: 'relative' }} ref={(el) => {
          if (openFolder === folderName) {
            (folderRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          }
        }}>
          <button
            type="button"
            className="bookmark-item"
            onClick={() => setOpenFolder(openFolder === folderName ? null : folderName)}
            aria-label={`Folder: ${folderName}`}
            aria-expanded={openFolder === folderName}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '11px',
              border: 'none',
              background: openFolder === folderName ? 'var(--bg-hover)' : 'transparent',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            {folderName}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style={{ marginLeft: '2px' }}>
              <path d="M0 2l4 4 4-4z" />
            </svg>
          </button>
          {openFolder === folderName && (
            <div
              role="menu"
              aria-label={`Bookmarks in ${folderName}`}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                minWidth: '200px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                padding: '4px',
                zIndex: 1000,
              }}
            >
              {items.map((bm) => (
                <button
                  key={bm.id}
                  role="menuitem"
                  onClick={() => handleBookmarkClick(bm.url)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: '14px', height: '14px', borderRadius: '2px', background: 'var(--bg-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', flexShrink: 0 }}>
                    {bm.favicon ? <img src={bm.favicon} alt="" style={{ width: '14px', height: '14px', borderRadius: '2px' }} /> : (bm.title[0] || '?').toUpperCase()}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bm.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Individual bookmarks (no folder) */}
      {noFolder.slice(0, 20).map((bookmark) => (
        <button
          type="button"
          key={bookmark.id}
          draggable="true"
          onDragStart={(e) => handleDragStart(e, bookmark.id)}
          onDragOver={(e) => handleDragOver(e, bookmark.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, bookmark.id)}
          onDragEnd={handleDragEnd}
          onClick={() => handleBookmarkClick(bookmark.url)}
          aria-label={bookmark.title}
          className="bookmark-item"
          style={{
            outline: dragOverId === bookmark.id ? '2px solid var(--accent)' : undefined,
            outlineOffset: '-2px',
          }}
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
});
