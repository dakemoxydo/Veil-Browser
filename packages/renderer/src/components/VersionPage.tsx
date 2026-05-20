import React, { useEffect, useState } from 'react';
import { Skeleton } from './Skeleton';

interface VersionInfo {
  appVersion: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
  v8Version: string;
  os: string;
  osVersion: string;
}

export const VersionPage: React.FC = () => {
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    window.veil?.version?.().then(setInfo).catch(() => {});
  }, []);

  const rows = info ? [
    { label: 'Veil Browser', value: info.appVersion },
    { label: 'Electron', value: info.electronVersion },
    { label: 'Chromium', value: info.chromeVersion },
    { label: 'Node.js', value: info.nodeVersion },
    { label: 'V8', value: info.v8Version },
    { label: 'OS', value: `${info.os} ${info.osVersion}` },
  ] : [];

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)' }}>
        About Veil Browser
      </h1>
      <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)' }}>
        {!info ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                <Skeleton width="100px" height="14px" />
                <Skeleton width="140px" height="14px" />
              </div>
            ))}
          </div>
        ) : rows.map((row) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.value}</span>
          </div>
        ))}
      </div>
      <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
        Veil Browser is a privacy-focused web browser built with Electron.
      </p>
    </div>
  );
};
