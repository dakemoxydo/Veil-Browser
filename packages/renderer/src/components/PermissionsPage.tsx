import React, { useState } from 'react';

interface Permission {
  name: string;
  description: string;
  allowed: boolean;
}

const PERMISSIONS: Permission[] = [
  { name: 'clipboard-read', description: 'Read from clipboard', allowed: true },
  { name: 'clipboard-sanitized-write', description: 'Write to clipboard', allowed: true },
  { name: 'notifications', description: 'Show notifications', allowed: false },
  { name: 'geolocation', description: 'Access location', allowed: false },
  { name: 'camera', description: 'Access camera', allowed: false },
  { name: 'microphone', description: 'Access microphone', allowed: false },
  { name: 'fullscreen', description: 'Enter fullscreen', allowed: true },
  { name: 'pointer-lock', description: 'Lock pointer', allowed: false },
];

export const PermissionsPage: React.FC = React.memo(() => {
  const [permissions, setPermissions] = useState<Permission[]>(PERMISSIONS);

  const handleToggle = (name: string) => {
    setPermissions(prev => prev.map(p =>
      p.name === name ? { ...p, allowed: !p.allowed } : p
    ));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h3 style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-md)', fontWeight: 600 }}>
        Site Permissions
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Control which permissions websites can request. Changes apply to all sites.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {permissions.map((perm) => (
          <div
            key={perm.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-3)',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)',
            }}
          >
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                {perm.name}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                {perm.description}
              </div>
            </div>
            <button
              onClick={() => handleToggle(perm.name)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: perm.allowed ? 'var(--color-secure)' : 'var(--danger)',
                background: perm.allowed ? 'rgba(24, 128, 56, 0.1)' : 'rgba(197, 34, 31, 0.1)',
                color: perm.allowed ? 'var(--color-secure)' : 'var(--danger)',
                fontSize: 'var(--font-size-xs)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
            >
              {perm.allowed ? 'Allowed' : 'Blocked'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});
