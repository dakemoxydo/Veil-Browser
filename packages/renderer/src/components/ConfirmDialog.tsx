import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const variantColors: Record<string, string> = {
  danger: 'var(--danger)',
  warning: 'var(--warning, #f59e0b)',
  info: 'var(--accent)',
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'info',
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'Tab') {
        // Trap focus inside dialog (C51)
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>('button, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onConfirm, onCancel]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />
      {/* Dialog */}
      <div
        style={{
          position: 'relative',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg, 12px)',
          padding: '24px',
          width: '400px',
          maxWidth: '90vw',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
        }}
      >
        <h2
          id="confirm-dialog-title"
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 8px',
          }}
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-message"
          style={{
            fontSize: 'var(--font-size-sm, 13px)',
            color: 'var(--text-secondary)',
            margin: '0 0 24px',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2, 8px)' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm, 6px)',
              border: '1px solid var(--border)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--font-size-sm, 13px)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm, 6px)',
              border: '1px solid transparent',
              background: variantColors[variant],
              color: variant === 'info' ? 'var(--bg-app, #000)' : '#fff',
              fontSize: 'var(--font-size-sm, 13px)',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
