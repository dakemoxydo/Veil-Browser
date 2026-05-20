import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useVeilStore } from '../store/useVeilStore';

export const RecentlyClosedPanel: React.FC = React.memo(() => {
  const recentlyClosed = useVeilStore((s) => s.recentlyClosed);
  const dispatch = useVeilStore((s) => s.dispatch);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  const updateDropdownPos = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, []);

  useEffect(() => {
    if (window.veil?.setOverlayVisible) {
      window.veil.setOverlayVisible(isOpen).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPos();
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
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
  }, [isOpen, updateDropdownPos]);

  const handleRestore = () => {
    dispatch({ type: 'TAB_RESTORE' });
    setIsOpen(false);
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        className="toolbar-btn"
        onClick={() => setIsOpen(!isOpen)}
        disabled={recentlyClosed.length === 0}
        aria-label="Recently closed tabs"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Recently closed"
        style={{
          color: recentlyClosed.length > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
          opacity: recentlyClosed.length > 0 ? 1 : 0.5,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          role="menu"
          className="dropdown-menu"
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            right: dropdownPos.right,
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: 'var(--space-2, 8px)',
            zIndex: 10000,
          }}
        >
          <div
            style={{
              fontSize: 'var(--font-size-base, 14px)',
              fontWeight: 'var(--font-weight-medium, 500)',
              color: 'var(--text-primary)',
              padding: 'var(--space-2, 8px) var(--space-3, 12px)',
              borderBottom: '1px solid var(--border-light)',
              marginBottom: 'var(--space-1, 4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Recently Closed</span>
            {recentlyClosed.length > 0 && (
              <button
                onClick={handleRestore}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  color: 'var(--accent)',
                  fontSize: 'var(--font-size-xs, 11px)',
                  padding: '2px 8px',
                  cursor: 'pointer',
                }}
              >
                Restore
              </button>
            )}
          </div>
          {recentlyClosed.length === 0 ? (
            <div style={{
              padding: 'var(--space-3, 12px)',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-sm, 13px)',
              textAlign: 'center',
            }}>
              No recently closed tabs
            </div>
          ) : (
            recentlyClosed.map((tab) => (
              <div
                key={tab.id}
                role="menuitem"
                tabIndex={0}
                onClick={handleRestore}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRestore();
                  }
                }}
                style={{
                  padding: 'var(--space-2, 8px) var(--space-3, 12px)',
                  borderRadius: 'var(--radius-sm, 6px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2, 8px)',
                  cursor: 'pointer',
                  transition: 'background 100ms ease-out',
                }}
              >
                {tab.favicon ? (
                  <img
                    src={tab.favicon}
                    alt=""
                    width={16}
                    height={16}
                    style={{ borderRadius: '2px', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: '2px',
                    background: 'var(--bg-hover)',
                    flexShrink: 0,
                  }} />
                )}
                <span
                  style={{
                    fontSize: 'var(--font-size-sm, 13px)',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {tab.title || tab.url}
                </span>
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
});
