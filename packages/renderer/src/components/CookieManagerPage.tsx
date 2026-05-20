import React, { useEffect, useState, useCallback } from 'react';

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  secure: boolean;
  httpOnly: boolean;
}

export const CookieManagerPage: React.FC = React.memo(() => {
  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCookies = useCallback(async () => {
    setLoading(true);
    try {
      const list = await window.veil?.cookieList?.();
      if (Array.isArray(list)) {
        setCookies(list);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadCookies(); }, [loadCookies]);

  const handleDelete = async (name: string, domain: string) => {
    await window.veil?.cookieDelete?.(name, domain);
    setTimeout(loadCookies, 100);
  };

  const filtered = search
    ? cookies.filter(c => c.name.includes(search) || c.domain.includes(search))
    : cookies;

  const grouped = filtered.reduce<Record<string, Cookie[]>>((acc, cookie) => {
    const domain = cookie.domain || 'unknown';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(cookie);
    return acc;
  }, {});

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: 'var(--text-primary)' }}>
        Cookie Manager
      </h1>

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cookies..."
          className="settings-input"
          style={{ flex: 1 }}
        />
        <button onClick={loadCookies} className="settings-btn" style={{ padding: '6px 16px' }}>
          Refresh
        </button>
      </div>

      <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
        {cookies.length} cookies total
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6)' }}>Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-6)' }}>No cookies found</div>
      ) : (
        Object.entries(grouped).map(([domain, domainCookies]) => (
          <div key={domain} style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              padding: 'var(--space-2) 0',
              borderBottom: '1px solid var(--border)',
              marginBottom: 'var(--space-2)',
            }}>
              {domain}
            </div>
            {domainCookies.map((cookie) => (
              <div
                key={`${cookie.domain}-${cookie.name}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 'var(--space-1)',
                  border: '1px solid var(--border-light)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                    {cookie.name}
                  </div>
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: 'var(--font-size-xs)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '400px',
                  }}>
                    {cookie.value}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {cookie.secure && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-secure)' }}>🔒</span>}
                  {cookie.httpOnly && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>HTTP</span>}
                  <button
                    onClick={() => handleDelete(cookie.name, cookie.domain)}
                    className="toolbar-btn"
                    style={{ fontSize: 'var(--font-size-xs)', padding: '2px 8px', color: 'var(--danger)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
});
