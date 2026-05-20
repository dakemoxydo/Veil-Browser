import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: 'var(--space-3, 12px)',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          lineHeight: 1,
          opacity: 0.5,
        }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: icon }}
      />
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: 'var(--font-size-sm, 13px)',
            color: 'var(--text-muted)',
            margin: 0,
            maxWidth: '300px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: 'var(--space-2, 8px)',
            padding: '8px 20px',
            borderRadius: 'var(--radius-sm, 6px)',
            border: '1px solid var(--border)',
            background: 'rgba(255, 255, 255, 0.05)',
            color: 'var(--accent)',
            fontSize: 'var(--font-size-sm, 13px)',
            cursor: 'pointer',
            fontFamily: 'var(--font-family)',
            transition: 'background 100ms ease-out',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
