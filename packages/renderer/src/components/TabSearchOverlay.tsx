import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { TabInfo } from '@veil/shared';

interface TabSearchOverlayProps {
  onClose: () => void;
}

export const TabSearchOverlay: React.FC<TabSearchOverlayProps> = ({ onClose }) => {
  const tabs = useVeilStore((s) => s.tabs);
  const dispatch = useVeilStore((s) => s.dispatch);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? tabs.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.url.toLowerCase().includes(query.toLowerCase())
      )
    : tabs;

  const selectTab = useCallback((tab: TabInfo) => {
    dispatch({ type: 'TAB_FOCUS', payload: { id: tab.id } });
    onClose();
  }, [dispatch, onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        selectTab(filtered[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, selectedIndex, onClose, selectTab]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)',
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '15vh',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '500px',
          maxHeight: '400px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search open tabs..."
          style={{
            padding: '12px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: 'var(--font-size-md)',
            outline: 'none',
          }}
        />
        <div style={{ overflow: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No tabs found
            </div>
          ) : (
            filtered.map((tab, i) => (
              <div
                key={tab.id}
                onClick={() => selectTab(tab)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  background: i === selectedIndex ? 'var(--bg-hover)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {tab.favicon && (
                  <img src={tab.favicon} alt="" width={16} height={16} style={{ borderRadius: '2px' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tab.title || tab.url}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tab.url}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
