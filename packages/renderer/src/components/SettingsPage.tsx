import React, { useState, useId } from 'react';
import { useVeilStore } from '../store/useVeilStore';
import { VeilSettings } from '@veil/shared';

type SettingsTab = 'general' | 'privacy' | 'appearance';

export const SettingsPage: React.FC = () => {
  const settings = useVeilStore((s) => s.settings);
  const dispatch = useVeilStore((s) => s.dispatch);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const update = (partial: Partial<VeilSettings>) => {
    dispatch({ type: 'SETTINGS_UPDATE', payload: partial });
  };

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'privacy', label: 'Privacy' },
    { key: 'appearance', label: 'Appearance' },
  ];

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      color: 'var(--veil-text-primary)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Sidebar */}
      <div style={{
        width: '180px',
        padding: '20px 12px',
        borderRight: '1px solid var(--veil-glass-border)',
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
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === tab.key ? 'var(--veil-text-primary)' : 'var(--veil-text-muted)',
              padding: '8px 12px',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        {activeTab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>General</h2>

            <SettingRow label="Homepage">
              <input
                type="text"
                value={settings.general.homepage}
                onChange={(e) => update({ general: { ...settings.general, homepage: e.target.value } })}
                style={inputStyle}
              />
            </SettingRow>

            <SettingRow label="Search engine">
              <select
                value={settings.general.searchEngine}
                onChange={(e) => update({ general: { ...settings.general, searchEngine: e.target.value as VeilSettings['general']['searchEngine'] } })}
                style={inputStyle}
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
                  style={inputStyle}
                />
              </SettingRow>
            )}

            <SettingRow label="Restore tabs on launch">
              <Toggle
                checked={settings.general.restoreTabsOnLaunch}
                onChange={(checked) => update({ general: { ...settings.general, restoreTabsOnLaunch: checked } })}
              />
            </SettingRow>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

            <SettingRow label="Do Not Track">
              <Toggle
                checked={settings.privacy.doNotTrack}
                onChange={(checked) => update({ privacy: { ...settings.privacy, doNotTrack: checked } })}
              />
            </SettingRow>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Appearance</h2>

            <SettingRow label="Show bookmarks bar">
              <Toggle
                checked={settings.appearance.showBookmarksBar}
                onChange={(checked) => update({ appearance: { ...settings.appearance, showBookmarksBar: checked } })}
              />
            </SettingRow>

            <SettingRow label="Show sidebar">
              <Toggle
                checked={settings.appearance.showSidebar}
                onChange={(checked) => update({ appearance: { ...settings.appearance, showSidebar: checked } })}
              />
            </SettingRow>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const id = useId();
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
    }}>
      <label htmlFor={id} style={{ fontSize: '14px', color: 'var(--veil-text-primary)', cursor: 'pointer' }}>{label}</label>
      <div id={id}>{children}</div>
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
    style={{
      width: '40px',
      height: '22px',
      borderRadius: '11px',
      background: checked ? 'var(--veil-accent)' : 'rgba(255,255,255,0.15)',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.2s',
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

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid var(--veil-glass-border)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--veil-text-primary)',
  fontSize: '13px',
  outline: 'none',
  width: '200px',
};
