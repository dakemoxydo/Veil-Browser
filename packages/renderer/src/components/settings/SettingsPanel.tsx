import { useState, type ReactNode } from 'react'
import {
  X, Globe, Shield, Palette, Download, RotateCcw, FolderOpen,
} from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import type { VeilSettings, SettingsPath, SettingsValue, SearchEngine, TabsPosition } from '@veil/shared'

type Section = 'general' | 'privacy' | 'appearance' | 'downloads'

const SECTIONS: { id: Section; label: string; icon: ReactNode }[] = [
  { id: 'general',    label: 'General',    icon: <Globe size={16} /> },
  { id: 'privacy',    label: 'Privacy',    icon: <Shield size={16} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
  { id: 'downloads',  label: 'Downloads',  icon: <Download size={16} /> },
]

const SEARCH_ENGINES = [
  { value: 'google',     label: 'Google' },
  { value: 'bing',       label: 'Bing' },
  { value: 'duckduckgo', label: 'DuckDuckGo' },
  { value: 'brave',      label: 'Brave Search' },
]

// ─── Main panel ───────────────────────────────────────────────────────────────

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<Section>('general')
  const { settings, update, reset, openDownloadsDir } = useSettings()

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 150ms var(--veil-ease)',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        onClick={e => e.stopPropagation()}
        style={{
          width: '740px', height: '580px',
          display: 'flex', overflow: 'hidden',
          borderRadius: 'var(--radius-panel)',
          animation: 'scaleIn 180ms var(--veil-spring)',
        }}
      >
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div style={{
          width: '190px',
          borderRight: '1px solid var(--veil-glass-border)',
          padding: '16px 10px',
          display: 'flex', flexDirection: 'column', gap: '2px',
          flexShrink: 0,
        }}>
          <div style={{
            padding: '4px 10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--veil-text-primary)' }}>
              Settings
            </span>
            <button
              className="no-drag"
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--veil-text-muted)', cursor: 'pointer', padding: '4px',
                borderRadius: '6px', display: 'flex', alignItems: 'center',
              }}
            >
              <X size={15} />
            </button>
          </div>

          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '10px', border: 'none',
                background: section === s.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: section === s.id ? 'var(--veil-text-primary)' : 'var(--veil-text-muted)',
                cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
                textAlign: 'left', width: '100%',
                transition: 'all 150ms var(--veil-ease)',
                fontWeight: section === s.id ? 600 : 400,
              }}
            >
              {s.icon}
              {s.label}
            </button>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={reset}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', borderRadius: '10px', border: 'none',
                background: 'transparent', color: 'var(--veil-danger)',
                cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
                width: '100%', opacity: 0.8,
              }}
            >
              <RotateCcw size={13} /> Reset to defaults
            </button>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 20px' }}>
          {section === 'general'    && <GeneralSection    s={settings} u={update} />}
          {section === 'privacy'    && <PrivacySection    s={settings} u={update} />}
          {section === 'appearance' && <AppearanceSection s={settings} u={update} />}
          {section === 'downloads'  && <DownloadsSection  s={settings} u={update} openDir={openDownloadsDir} />}
        </div>
      </div>
    </div>
  )
}

// ─── Reusable primitives ──────────────────────────────────────────────────────

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: 700, color: 'var(--veil-text-primary)' }}>
      {children}
    </h2>
  )
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 0', gap: '16px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: 'var(--veil-text-primary)', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: '11px', color: 'var(--veil-text-muted)', marginTop: '3px', lineHeight: '1.4' }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch" aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: '46px', height: '26px', borderRadius: '13px', border: 'none',
        background: on ? 'var(--veil-accent)' : 'rgba(255,255,255,0.14)',
        cursor: 'pointer', position: 'relative',
        transition: 'background 200ms var(--veil-ease)',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: '4px',
        left: on ? '24px' : '4px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: 'white',
        transition: 'left 200ms var(--veil-spring)',
        display: 'block',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

function Sel({ value, opts, onChange }: { value: string; opts: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid var(--veil-glass-border)',
        borderRadius: '8px', outline: 'none',
        color: 'var(--veil-text-primary)', padding: '6px 10px',
        fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer',
        minWidth: '150px',
      }}
    >
      {opts.map(o => <option key={o.value} value={o.value} style={{ background: '#1a1a2e' }}>{o.label}</option>)}
    </select>
  )
}

function Slider({ value, min, max, onChange, suffix = '' }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '130px', cursor: 'pointer', accentColor: 'var(--veil-accent)' }}
      />
      <span style={{ fontSize: '12px', color: 'var(--veil-text-muted)', minWidth: '40px', textAlign: 'right' }}>
        {value}{suffix}
      </span>
    </div>
  )
}

function TextBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value)
  return (
    <input
      type="text" value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onChange(local)}
      onKeyDown={e => e.key === 'Enter' && onChange(local)}
      placeholder={placeholder}
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid var(--veil-glass-border)',
        borderRadius: '8px', outline: 'none',
        color: 'var(--veil-text-primary)', padding: '6px 10px',
        fontSize: '13px', fontFamily: 'inherit', width: '210px',
        transition: 'border-color 150ms ease',
      }}
    />
  )
}

// ─── Section implementations ──────────────────────────────────────────────────

function GeneralSection({ s, u }: { s: VeilSettings; u: <T extends SettingsPath>(p: T, v: SettingsValue<T>) => void }) {
  return (
    <div>
      <SectionTitle>General</SectionTitle>
      <SettingRow label="Home Page" desc="URL opened when you press home or open a new tab">
        <TextBox value={s.general.homePage} onChange={v => u('general.homePage', v)} placeholder="https://..." />
      </SettingRow>
      <SettingRow label="Default Search Engine" desc="Used for non-URL queries in the address bar">
        <Sel value={s.general.searchEngine} opts={SEARCH_ENGINES} onChange={v => u('general.searchEngine', v as SearchEngine)} />
      </SettingRow>
      <SettingRow label="Restore previous session" desc="Reopen all tabs from your last session on startup">
        <Toggle on={s.general.restoreSession} onChange={v => u('general.restoreSession', v)} />
      </SettingRow>
      <SettingRow label="Show Home button">
        <Toggle on={s.general.showHomeButton} onChange={v => u('general.showHomeButton', v)} />
      </SettingRow>
    </div>
  )
}

function PrivacySection({ s, u }: { s: VeilSettings; u: <T extends SettingsPath>(p: T, v: SettingsValue<T>) => void }) {
  return (
    <div>
      <SectionTitle>Privacy & Security</SectionTitle>
      <SettingRow label="Block Ads & Trackers" desc="Uses EasyList + EasyPrivacy — toggles the adblocker engine">
        <Toggle on={s.privacy.adblockEnabled} onChange={v => u('privacy.adblockEnabled', v)} />
      </SettingRow>
      <SettingRow label="Enhanced Tracker Blocking" desc="Extra protection against fingerprinting and cross-site trackers">
        <Toggle on={s.privacy.blockTrackers} onChange={v => u('privacy.blockTrackers', v)} />
      </SettingRow>
      <SettingRow label="Auto-upgrade HTTP → HTTPS" desc="Intercepts insecure requests and redirects to HTTPS">
        <Toggle on={s.privacy.httpsUpgrade} onChange={v => u('privacy.httpsUpgrade', v)} />
      </SettingRow>
      <SettingRow label="Clear cookies on exit" desc="Deletes all stored cookies when the browser closes">
        <Toggle on={s.privacy.clearCookiesOnExit} onChange={v => u('privacy.clearCookiesOnExit', v)} />
      </SettingRow>
      <SettingRow label="Clear history on exit">
        <Toggle on={s.privacy.clearHistoryOnExit} onChange={v => u('privacy.clearHistoryOnExit', v)} />
      </SettingRow>
    </div>
  )
}

function AppearanceSection({ s, u }: { s: VeilSettings; u: <T extends SettingsPath>(p: T, v: SettingsValue<T>) => void }) {
  return (
    <div>
      <SectionTitle>Appearance</SectionTitle>
      <SettingRow label="Accent Color" desc="Applied to highlights, active tabs, and focus rings">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="color" value={s.appearance.accentColor}
            onChange={e => u('appearance.accentColor', e.target.value)}
            style={{
              width: '38px', height: '28px', padding: '0 2px',
              borderRadius: '6px', border: '1px solid var(--veil-glass-border)',
              cursor: 'pointer', background: 'transparent',
            }}
          />
          <span style={{ fontSize: '12px', color: 'var(--veil-text-muted)', fontFamily: 'monospace' }}>
            {s.appearance.accentColor.toUpperCase()}
          </span>
        </div>
      </SettingRow>
      <SettingRow label="Glass Blur Strength" desc="Backdrop blur radius for the Liquid Glass effect">
        <Slider value={s.appearance.blurStrength} min={4} max={40} onChange={v => u('appearance.blurStrength', v)} suffix="px" />
      </SettingRow>
      <SettingRow label="Tab Bar Position">
        <Sel
          value={s.appearance.tabsPosition}
          opts={[{ value: 'top', label: 'Top' }, { value: 'side', label: 'Sidebar' }]}
          onChange={v => u('appearance.tabsPosition', v as TabsPosition)}
        />
      </SettingRow>
      <SettingRow label="Compact Mode" desc="Reduces padding for a denser, more information-dense UI">
        <Toggle on={s.appearance.compactMode} onChange={v => u('appearance.compactMode', v)} />
      </SettingRow>
    </div>
  )
}

function DownloadsSection({ s, u, openDir }: { s: VeilSettings; u: <T extends SettingsPath>(p: T, v: SettingsValue<T>) => void; openDir: () => void }) {
  return (
    <div>
      <SectionTitle>Downloads</SectionTitle>
      <SettingRow label="Ask where to save each file" desc="Show a save dialog before every download starts">
        <Toggle on={s.downloads.askWhereSave} onChange={v => u('downloads.askWhereSave', v)} />
      </SettingRow>
      <SettingRow label="Default Download Folder" desc="Used automatically when 'Ask' is off">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '12px', color: 'var(--veil-text-muted)',
            maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {s.downloads.defaultPath || '~/Downloads (default)'}
          </span>
          <button
            onClick={openDir}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', borderRadius: '8px',
              border: '1px solid var(--veil-glass-border)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--veil-text-primary)',
              cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
            }}
          >
            <FolderOpen size={13} /> Open
          </button>
        </div>
      </SettingRow>
    </div>
  )
}
