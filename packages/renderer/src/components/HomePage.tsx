import React, { useState, useEffect } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { getSearchUrl } from '@veil/shared';

const QUICK_LINKS = [
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com', color: '#de5833' },
  { name: 'GitHub', url: 'https://github.com', color: '#f0f6fc' },
  { name: 'YouTube', url: 'https://youtube.com', color: '#ff0000' },
  { name: 'Reddit', url: 'https://reddit.com', color: '#ff4500' },
  { name: 'Wikipedia', url: 'https://wikipedia.org', color: '#636466' },
  { name: 'Twitter', url: 'https://x.com', color: '#1da1f2' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export const HomePage: React.FC = React.memo(() => {
  const [searchValue, setSearchValue] = useState('');
  const [greeting, setGreeting] = useState(getGreeting);
  const dispatch = useVeilStore((s) => s.dispatch);
  const activeTabId = useVeilStore((s) => s.activeTabId);
  const settings = useVeilStore((s) => s.settings);

  useEffect(() => {
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      const url = getSearchUrl(searchValue.trim(), settings.general.searchEngine, settings.general.customSearchUrl);
      if (activeTabId) {
        dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url } });
      } else {
        dispatch({ type: 'TAB_NEW', payload: { url } });
      }
    }
  };

  const handleNavigate = (url: string) => {
    if (activeTabId) {
      dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url } });
    } else {
      dispatch({ type: 'TAB_NEW', payload: { url } });
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: '32px',
        padding: '40px',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(138, 180, 248, 0.06) 0%, var(--bg-surface) 60%)',
      }}
    >
      <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '-16px' }}>{greeting}</div>

      <h1 style={{ fontSize: '40px', fontWeight: 300, letterSpacing: '2px', color: 'var(--text-primary)', margin: 0 }}>VEIL</h1>

      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        border: '1px solid var(--glass-border)',
        borderRadius: '20px',
        padding: '24px 32px',
        maxWidth: '580px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <input
          type="text"
          placeholder="Search or enter URL"
          aria-label="Search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleSearch}
          className="omnibox"
          style={{
            width: '100%',
            textAlign: 'center',
          }}
        />
      </div>

      <div
        role="group"
        aria-label="Quick links"
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: '500px',
        }}
      >
        {QUICK_LINKS.map((link) => (
          <button
            key={link.name}
            onClick={() => handleNavigate(link.url)}
            aria-label={link.name}
            className="quick-link"
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-round)',
                background: link.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 600,
                color: '#fff',
              }}
            >
              {link.name[0]}
            </div>
            <span
              style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '64px',
              }}
            >
              {link.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});
