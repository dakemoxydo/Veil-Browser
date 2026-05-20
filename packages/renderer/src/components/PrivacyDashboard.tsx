import React, { useEffect, useState } from 'react';

interface PrivacyStats {
  blockedAds: number;
  blockedTrackers: number;
  httpsUpgrades: number;
  cookiesBlocked: number;
  topBlockedDomains: { domain: string; count: string }[];
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => (
  <div
    style={{
      background: 'var(--bg-elevated)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flex: 1,
      minWidth: '180px',
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: '12px',
        background: `${color}15`,
        border: `1px solid ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
        <path d={icon} />
      </svg>
    </div>
    <div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize: 'var(--font-size-xs, 11px)', color: 'var(--text-muted)', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  </div>
);

export const PrivacyDashboard: React.FC = () => {
  const [stats, setStats] = useState<PrivacyStats | null>(null);

  useEffect(() => {
    window.veil?.privacyStats?.().then(setStats).catch(() => {});
  }, []);

  const cards: StatCardProps[] = [
    {
      label: 'Ads blocked',
      value: stats?.blockedAds ?? 0,
      icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z',
      color: '#ef4444',
    },
    {
      label: 'Trackers blocked',
      value: stats?.blockedTrackers ?? 0,
      icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
      color: '#8b5cf6',
    },
    {
      label: 'HTTPS upgrades',
      value: stats?.httpsUpgrades ?? 0,
      icon: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
      color: '#22c55e',
    },
    {
      label: 'Cookies blocked',
      value: stats?.cookiesBlocked ?? 0,
      icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
      color: '#f59e0b',
    },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
        Privacy Dashboard
      </h1>
      <p style={{ fontSize: 'var(--font-size-sm, 13px)', color: 'var(--text-muted)', margin: '0 0 24px' }}>
        Overview of privacy protections while browsing
      </p>

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Top blocked domains */}
      {stats?.topBlockedDomains && stats.topBlockedDomains.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              margin: '0 0 12px',
            }}
          >
            Top blocked domains
          </h2>
          <div
            style={{
              background: 'var(--bg-elevated)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            {stats.topBlockedDomains.map((entry, idx) => (
              <div
                key={entry.domain}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 20px',
                  borderBottom:
                    idx < stats.topBlockedDomains.length - 1
                      ? '1px solid var(--border-light)'
                      : 'none',
                }}
              >
                <span style={{ fontSize: 'var(--font-size-sm, 13px)', color: 'var(--text-primary)' }}>
                  {entry.domain}
                </span>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs, 11px)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-family-monospace)',
                  }}
                >
                  {entry.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!stats && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
          Loading privacy statistics...
        </div>
      )}
    </div>
  );
};
