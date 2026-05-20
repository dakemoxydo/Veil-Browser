import React, { useState, useRef, useEffect, useCallback } from 'react';

interface FindBarProps {
  onClose: () => void;
}

export const FindBar: React.FC<FindBarProps> = React.memo(({ onClose }) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      window.veil?.stopFind?.().catch(() => {});
    };
  }, []);

  const doFind = useCallback((query: string) => {
    if (window.veil?.findInPage) {
      window.veil.findInPage(query).catch(() => {});
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doFind(val), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      doFind(text);
    }
  };

  return (
    <div
      role="search"
      aria-label="Find in page"
      style={{
        position: 'absolute',
        top: 0,
        right: 16,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Find in page..."
        className="find-bar-input"
      />
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
        }}
        aria-label="Close find"
      >
        ×
      </button>
    </div>
  );
});
