import React from 'react';

interface ShortcutEntry {
  keys: string;
  description: string;
}

interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutEntry[];
}

const shortcutCategories: ShortcutCategory[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: 'Ctrl+L', description: 'Focus address bar' },
      { keys: 'Alt+Left', description: 'Go back' },
      { keys: 'Alt+Right', description: 'Go forward' },
      { keys: 'Ctrl+R / F5', description: 'Reload page' },
      { keys: 'Ctrl+Shift+R', description: 'Hard reload (skip cache)' },
      { keys: 'Esc', description: 'Stop loading' },
      { keys: 'Ctrl+F', description: 'Find in page' },
    ],
  },
  {
    name: 'Tabs',
    shortcuts: [
      { keys: 'Ctrl+T', description: 'New tab' },
      { keys: 'Ctrl+W', description: 'Close tab' },
      { keys: 'Ctrl+Shift+T', description: 'Restore closed tab' },
      { keys: 'Ctrl+Tab', description: 'Next tab' },
      { keys: 'Ctrl+Shift+Tab', description: 'Previous tab' },
      { keys: 'Ctrl+1..9', description: 'Switch to tab N' },
    ],
  },
  {
    name: 'Bookmarks',
    shortcuts: [
      { keys: 'Ctrl+D', description: 'Bookmark current page' },
    ],
  },
  {
    name: 'Developer',
    shortcuts: [
      { keys: 'Ctrl+Shift+I', description: 'Toggle debug console' },
      { keys: 'Ctrl+Shift+J', description: 'Toggle developer tools' },
    ],
  },
  {
    name: 'Privacy',
    shortcuts: [
      { keys: 'Ctrl+Shift+N', description: 'Open incognito window' },
    ],
  },
];

export const ShortcutsPage: React.FC = () => {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}>
      <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid var(--border-light)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Keyboard Shortcuts</h1>
        <p style={{ fontSize: 'var(--font-size-sm, 13px)', color: 'var(--text-muted)', margin: '8px 0 0' }}>
          All available keyboard shortcuts for Veil Browser
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 40px 40px' }}>
        {shortcutCategories.map((category) => (
          <div key={category.name} style={{ marginBottom: '32px' }}>
            <h2
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 12px',
              }}
            >
              {category.name}
            </h2>
            <div
              style={{
                background: 'var(--bg-elevated)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
              }}
            >
              {category.shortcuts.map((shortcut, idx) => (
                <div
                  key={shortcut.keys}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderBottom: idx < category.shortcuts.length - 1 ? '1px solid var(--border-light)' : 'none',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm, 13px)' }}>
                    {shortcut.description}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {shortcut.keys.split(' / ').map((combo, comboIdx) => (
                      <React.Fragment key={combo}>
                        {comboIdx > 0 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px', alignSelf: 'center' }}>or</span>
                        )}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {combo.split('+').map((key) => (
                            <kbd
                              key={key}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm, 6px)',
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                                backdropFilter: 'blur(var(--glass-blur))',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                                fontWeight: 500,
                                fontFamily: 'var(--font-family-monospace)',
                                minWidth: '24px',
                                lineHeight: 1.4,
                              }}
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
