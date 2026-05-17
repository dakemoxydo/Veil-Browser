import React, { useState } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { getSearchUrl } from '@veil/shared';

const QUICK_LINKS = [
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com', color: '#de5833' },
  { name: 'GitHub', url: 'https://github.com', color: '#333' },
  { name: 'YouTube', url: 'https://youtube.com', color: '#ff0000' },
  { name: 'Reddit', url: 'https://reddit.com', color: '#ff4500' },
  { name: 'Wikipedia', url: 'https://wikipedia.org', color: '#636466' },
  { name: 'Twitter', url: 'https://x.com', color: '#1da1f2' },
];

export const HomePage: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const dispatch = useVeilStore((s) => s.dispatch);
  const activeTabId = useVeilStore((s) => s.activeTabId);
  const settings = useVeilStore((s) => s.settings);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeTabId && searchValue.trim()) {
      dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url: getSearchUrl(searchValue.trim(), settings.general.searchEngine, settings.general.customSearchUrl) } });
    }
  };

  const handleNavigate = (url: string) => {
    if (activeTabId) {
      dispatch({ type: 'TAB_NAVIGATE', payload: { id: activeTabId, url } });
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
        background: 'var(--bg-surface)',
      }}
    >
      <div
        style={{
          fontSize: '40px',
          fontWeight: 300,
          color: 'var(--text-primary)',
          letterSpacing: '2px',
        }}
      >
        VEIL
      </div>

      <input
        type="text"
        placeholder="Search or enter URL"
        aria-label="Search"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onKeyDown={handleSearch}
        className="omnibox"
        style={{
          maxWidth: '560px',
          height: '44px',
          borderRadius: '24px',
          fontSize: 'var(--font-size-lg)',
        }}
      />

      <div
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
};
