import React, { useState, useEffect } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { VeilSettings, ProxySettings } from '@veil/shared';

type SettingsTab = 'general' | 'privacy' | 'appearance' | 'proxy';

export const SettingsPage: React.FC = React.memo(() => {
  const settings = useVeilStore((s) => s.settings);
  const dispatch = useVeilStore((s) => s.dispatch);
  const debugPanelVisible = useVeilStore((s) => s.debugPanelVisible);
  const toggleDebugPanel = useVeilStore((s) => s.toggleDebugPanel);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const update = (partial: Partial<VeilSettings>) => {
    dispatch({ type: 'SETTINGS_UPDATE', payload: partial });
  };

  const [customListUrl, setCustomListUrl] = useState('');
  const [customLists, setCustomLists] = useState<string[]>([]);

  useEffect(() => {
    // Load custom adblock lists
    window.veil?.adblockGetCustomLists?.().then((lists: string[]) => {
      setCustomLists(lists);
    }).catch(() => {});
  }, []);

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'privacy', label: 'Privacy' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'proxy', label: 'Proxy' },
  ];

  const handleAddCustomList = async () => {
    if (!customListUrl.trim()) return;
    const result = await window.veil?.adblockAddCustomList?.(customListUrl.trim());
    if (result?.success) {
      setCustomLists(prev => [...prev, customListUrl.trim()]);
      setCustomListUrl('');
    }
  };

  const handleRemoveCustomList = async (url: string) => {
    const result = await window.veil?.adblockRemoveCustomList?.(url);
    if (result?.success) {
      setCustomLists(prev => prev.filter(l => l !== url));
    }
  };

  const handleProxyUpdate = async (config: Record<string, unknown>) => {
    const fullConfig = { ...settings.proxy, ...config } as ProxySettings;
    await window.veil?.proxySetConfig?.(fullConfig);
    update({ proxy: fullConfig });
  };

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-family)',
    }}>
      {/* Sidebar */}
      <div role="tablist" aria-label="Settings sections" style={{
        width: '180px',
        padding: '20px 12px',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 700, padding: '8px 12px', marginBottom: '12px', letterSpacing: '1px' }}>
          Settings
        </div>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`settings-panel-${tab.key}`}
            id={`settings-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`settings-sidebar-btn ${activeTab === tab.key ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        {activeTab === 'general' && (
          <div role="tabpanel" id="settings-panel-general" aria-labelledby="settings-tab-general" aria-label="General settings" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>General</h2>

            <SettingRow label="Homepage">
              <input
                type="text"
                value={settings.general.homepage}
                onChange={(e) => update({ general: { ...settings.general, homepage: e.target.value } })}
                className="settings-input"
              />
            </SettingRow>

            <SettingRow label="Search engine">
              <select
                value={settings.general.searchEngine}
                onChange={(e) => update({ general: { ...settings.general, searchEngine: e.target.value as VeilSettings['general']['searchEngine'] } })}
                className="settings-input"
              >
                <option value="duckduckgo">DuckDuckGo</option>
                <option value="google">Google</option>
                <option value="brave">Brave Search</option>
                <option value="custom">Custom</option>
              </select>
            </SettingRow>

            {settings.general.searchEngine === 'custom' && (
              <SettingRow label="Custom search URL">
                <input
                  type="text"
                  placeholder="https://example.com/search?q="
                  value={settings.general.customSearchUrl}
                  onChange={(e) => update({ general: { ...settings.general, customSearchUrl: e.target.value } })}
                  className="settings-input"
                />
              </SettingRow>
            )}

            <SettingRow label="Restore tabs on launch">
              <Toggle
                checked={settings.general.restoreTabsOnLaunch}
                onChange={(checked) => update({ general: { ...settings.general, restoreTabsOnLaunch: checked } })}
              />
            </SettingRow>

            <SettingRow label="Show debug console">
              <Toggle
                checked={debugPanelVisible}
                onChange={() => toggleDebugPanel()}
              />
            </SettingRow>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div role="tabpanel" id="settings-panel-privacy" aria-labelledby="settings-tab-privacy" aria-label="Privacy settings" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Privacy</h2>

            <SettingRow label="Ad blocker">
              <Toggle
                checked={settings.privacy.adblockEnabled}
                onChange={(checked) => update({ privacy: { ...settings.privacy, adblockEnabled: checked } })}
              />
            </SettingRow>

            <SettingRow label="Block trackers">
              <Toggle
                checked={settings.privacy.blockTrackers}
                onChange={(checked) => update({ privacy: { ...settings.privacy, blockTrackers: checked } })}
              />
            </SettingRow>

            <SettingRow label="Fingerprint protection">
              <Toggle
                checked={settings.privacy.fingerprintProtection}
                onChange={(checked) => update({ privacy: { ...settings.privacy, fingerprintProtection: checked } })}
              />
            </SettingRow>

            <SettingRow label="Do Not Track">
              <Toggle
                checked={settings.privacy.doNotTrack}
                onChange={(checked) => update({ privacy: { ...settings.privacy, doNotTrack: checked } })}
              />
            </SettingRow>

            <SettingRow label="Block third-party cookies">
              <Toggle
                checked={settings.privacy.blockThirdPartyCookies}
                onChange={(checked) => update({ privacy: { ...settings.privacy, blockThirdPartyCookies: checked } })}
              />
            </SettingRow>

            <SettingRow label="Clear cookies on exit">
              <Toggle
                checked={settings.privacy.clearCookiesOnStart}
                onChange={(checked) => update({ privacy: { ...settings.privacy, clearCookiesOnStart: checked } })}
              />
            </SettingRow>

            <SettingRow label="HTTPS Everywhere">
              <Toggle
                checked={settings.privacy.httpsUpgrade}
                onChange={(checked) => update({ privacy: { ...settings.privacy, httpsUpgrade: checked } })}
              />
            </SettingRow>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px', color: 'var(--text-secondary)' }}>
                Custom Filter Lists
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                Add ABP/easylist format filter lists to extend ad blocking
              </p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={customListUrl}
                  onChange={e => setCustomListUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomList()}
                  placeholder="https://example.com/filters.txt"
                  className="settings-input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleAddCustomList}
                  style={{
                    ...clearBtnStyle,
                    background: 'var(--accent)',
                    color: '#000',
                    fontWeight: 600,
                    border: 'none',
                  }}
                >
                  Add
                </button>
              </div>
              {customLists.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {customLists.map(url => (
                    <div
                      key={url}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                        {url}
                      </span>
                      <button
                        onClick={() => handleRemoveCustomList(url)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: '2px 6px',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 16px', color: 'var(--text-secondary)' }}>
                Clear Browsing Data
              </h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => dispatch({ type: 'HISTORY_CLEAR' })}
                  style={clearBtnStyle}
                >
                  Clear History
                </button>
                <button
                  onClick={() => {
                    dispatch({ type: 'HISTORY_CLEAR' });
                    if (window.veil?.clearCookies) {
                      window.veil.clearCookies().catch(() => {});
                    }
                  }}
                  style={{ ...clearBtnStyle, color: 'var(--danger)' }}
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div role="tabpanel" id="settings-panel-appearance" aria-labelledby="settings-tab-appearance" aria-label="Appearance settings" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Appearance</h2>

            <SettingRow label="Theme">
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['dark', 'light', 'system'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => update({ appearance: { ...settings.appearance, theme: value } })}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${settings.appearance.theme === value ? 'var(--accent)' : 'var(--border)'}`,
                      background: settings.appearance.theme === value ? 'var(--accent-focus)' : 'transparent',
                      color: settings.appearance.theme === value ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 150ms ease-out',
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow label="Font size">
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['small', 'medium', 'large'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => update({ appearance: { ...settings.appearance, fontSize: value } })}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${settings.appearance.fontSize === value ? 'var(--accent)' : 'var(--border)'}`,
                      background: settings.appearance.fontSize === value ? 'var(--accent-focus)' : 'transparent',
                      color: settings.appearance.fontSize === value ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 150ms ease-out',
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </SettingRow>

            <SettingRow label="Accent color">
              <input
                type="color"
                value={settings.appearance.accentColor}
                onChange={(e) => update({ appearance: { ...settings.appearance, accentColor: e.target.value } })}
                style={{
                  width: '40px',
                  height: '32px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: 'transparent',
                  padding: '2px',
                }}
              />
            </SettingRow>

            <SettingRow label="Compact mode">
              <Toggle
                checked={settings.appearance.compactMode}
                onChange={(checked) => update({ appearance: { ...settings.appearance, compactMode: checked } })}
              />
            </SettingRow>

            <SettingRow label="Show bookmarks bar">
              <Toggle
                checked={settings.appearance.showBookmarksBar}
                onChange={(checked) => update({ appearance: { ...settings.appearance, showBookmarksBar: checked } })}
              />
            </SettingRow>
          </div>
        )}

        {activeTab === 'proxy' && (
          <div role="tabpanel" id="settings-panel-proxy" aria-labelledby="settings-tab-proxy" aria-label="Proxy settings" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Proxy</h2>

            <SettingRow label="Proxy mode">
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['direct', 'system', 'manual'] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => handleProxyUpdate({ mode: value })}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${settings.proxy.mode === value ? 'var(--accent)' : 'var(--border)'}`,
                      background: settings.proxy.mode === value ? 'var(--accent-focus)' : 'transparent',
                      color: settings.proxy.mode === value ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 150ms ease-out',
                    }}
                  >
                    {value === 'direct' ? 'Direct' : value === 'system' ? 'System' : 'Manual'}
                  </button>
                ))}
              </div>
            </SettingRow>

            {settings.proxy.mode === 'manual' && (
              <>
                <SettingRow label="Protocol">
                  <select
                    value={settings.proxy.protocol || 'http'}
                    onChange={(e) => handleProxyUpdate({ protocol: e.target.value as 'http' | 'socks5' })}
                    className="settings-input"
                  >
                    <option value="http">HTTP</option>
                    <option value="socks5">SOCKS5</option>
                  </select>
                </SettingRow>

                <SettingRow label="Host">
                  <input
                    type="text"
                    value={settings.proxy.host || ''}
                    onChange={(e) => handleProxyUpdate({ host: e.target.value })}
                    placeholder="127.0.0.1"
                    className="settings-input"
                  />
                </SettingRow>

                <SettingRow label="Port">
                  <input
                    type="number"
                    value={settings.proxy.port || ''}
                    onChange={(e) => handleProxyUpdate({ port: parseInt(e.target.value) || undefined })}
                    placeholder="8080"
                    className="settings-input"
                    style={{ width: '100px' }}
                  />
                </SettingRow>
              </>
            )}

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>
              {settings.proxy.mode === 'direct' && 'All connections go directly without a proxy.'}
              {settings.proxy.mode === 'system' && 'Use your operating system\'s proxy settings.'}
              {settings.proxy.mode === 'manual' && 'Route traffic through the specified proxy server.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
    }}>
      <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{label}</span>
      <div>{children}</div>
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <div
    role="switch"
    aria-checked={checked}
    tabIndex={0}
    onClick={() => onChange(!checked)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(!checked);
      }
    }}
    className="toggle-switch"
    style={{
      width: '40px',
      height: '22px',
      borderRadius: '11px',
      background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.2s, box-shadow 0.2s',
      outline: 'none',
    }}
  >
    <div style={{
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: '#fff',
      position: 'absolute',
      top: '2px',
      left: checked ? '20px' : '2px',
      transition: 'left 0.2s',
    }} />
  </div>
);

const clearBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--text-secondary)',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'background 0.15s',
};
