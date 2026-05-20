import React, { useEffect, useState, useRef } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { ToastItem } from '@veil/shared';

const typeColors: Record<ToastItem['type'], string> = {
  info: 'var(--accent)',
  success: 'var(--success, #22c55e)',
  warning: 'var(--warning, #f59e0b)',
  error: 'var(--danger)',
};

const typeIcons: Record<ToastItem['type'], string> = {
  info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  success: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  error: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
};

const Toast: React.FC<{ toast: ToastItem; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    timeoutRef.current = setTimeout(() => onRemove(toast.id), 200);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2, 8px)',
        padding: 'var(--space-2, 8px) var(--space-3, 12px)',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        border: `1px solid ${typeColors[toast.type]}`,
        borderLeft: `3px solid ${typeColors[toast.type]}`,
        borderRadius: 'var(--radius-md, 8px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        color: 'var(--text-primary)',
        fontSize: 'var(--font-size-sm, 13px)',
        fontFamily: 'var(--font-family)',
        minWidth: '280px',
        maxWidth: '400px',
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={typeColors[toast.type]}
        style={{ flexShrink: 0 }}
      >
        <path d={typeIcons[toast.type]} />
      </svg>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <button
        onClick={handleClose}
        aria-label="Dismiss notification"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = React.memo(() => {
  const toasts = useVeilStore((s) => s.toasts);
  const removeToast = useVeilStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 'var(--space-4, 16px)',
        right: 'var(--space-4, 16px)',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: 'var(--space-2, 8px)',
        zIndex: 11000,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <Toast toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
});
