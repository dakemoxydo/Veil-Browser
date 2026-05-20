import React, { useEffect, useState, useCallback } from 'react';

interface SiteEntry {
  hostname: string;
  blocked: boolean;
}

export const ScriptBlockPanel: React.FC = React.memo(() => {
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [newHostname, setNewHostname] = useState('');

  const loadSites = useCallback(async () => {
    try {
      const state = await window.veil?.getState?.();
      if (state?.scriptBlockList) {
        setSites(state.scriptBlockList);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSites(); }, [loadSites]);

  const handleToggle = async (hostname: string) => {
    await window.veil?.dispatch?.({ type: 'SCRIPT_BLOCK_TOGGLE', payload: { hostname } });
    setTimeout(loadSites, 100);
  };

  const handleAdd = async () => {
    if (!newHostname.trim()) return;
    await window.veil?.dispatch?.({ type: 'SCRIPT_BLOCK_SITE', payload: { hostname: newHostname.trim(), blocked: true } });
    setNewHostname('');
    setTimeout(loadSites, 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h3 style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-md)', fontWeight: 600 }}>
        Script Blocking
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        Block JavaScript on specific websites. Blocked sites will have JS disabled.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <input
          type="text"
          value={newHostname}
          onChange={(e) => setNewHostname(e.target.value)}
          placeholder="example.com"
          className="settings-input"
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className="settings-btn" style={{ padding: '6px 16px' }}>
          Block
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        {sites.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', padding: 'var(--space-3)', textAlign: 'center' }}>
            No sites configured
          </div>
        ) : (
          sites.map((site) => (
            <div
              key={site.hostname}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
              }}
            >
              <span style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>
                {site.hostname}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{
                  color: site.blocked ? 'var(--danger)' : 'var(--color-secure)',
                  fontSize: 'var(--font-size-xs)',
                }}>
                  {site.blocked ? 'Blocked' : 'Allowed'}
                </span>
                <button
                  onClick={() => handleToggle(site.hostname)}
                  className="toolbar-btn"
                  style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px' }}
                >
                  {site.blocked ? 'Allow' : 'Block'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
