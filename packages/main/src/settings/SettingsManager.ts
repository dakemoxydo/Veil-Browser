import { app, session, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import type { VeilSettings } from '@veil/shared'
import { DEFAULT_SETTINGS } from '@veil/shared'
import { StateBroadcaster } from '../ipc/StateBroadcaster'
import type { AdblockEngine } from '../network/AdblockEngine'

const SETTINGS_FILE = path.join(app.getPath('userData'), 'veil-settings.json')

/**
 * SettingsManager — persists user settings to disk and applies them
 * to Electron subsystems (session, adblock, downloads, etc.)
 */
export class SettingsManager {
  private settings: VeilSettings = DEFAULT_SETTINGS
  private adblock: AdblockEngine | null = null
  private httpsUpgradeEnabled = false

  attach(adblock: AdblockEngine) {
    this.adblock = adblock
  }

  /** Load from disk and broadcast initial state. Call once at startup. */
  load(): VeilSettings {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
        const parsed = JSON.parse(raw) as Partial<VeilSettings>
        // Deep merge with defaults so new keys survive upgrades
        this.settings = mergeSettings(DEFAULT_SETTINGS, parsed)
        console.log('[Settings] Loaded from', SETTINGS_FILE)
      } else {
        console.log('[Settings] No settings file — using defaults')
        this.save()
      }
    } catch (err) {
      console.error('[Settings] Failed to load, using defaults:', err)
      this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as VeilSettings
    }
    this._apply()
    this._initHttpsUpgrade()
    return this.settings
  }

  get(): VeilSettings {
    return this.settings
  }

  /**
   * Update a single value by dot-path (e.g. 'appearance.blurStrength')
   * and persist + apply changes.
   */
  update(dotPath: string, value: unknown) {
    const [section, key] = dotPath.split('.') as [keyof VeilSettings, string]
    if (!(section in this.settings)) {
      console.warn('[Settings] Unknown section:', section)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic key
    ;(this.settings[section] as any)[key] = value
    this.save()
    this._apply(section, key)
    StateBroadcaster.patch({ settings: { ...this.settings } })
    console.log(`[Settings] Updated ${dotPath} =`, value)
  }

  reset() {
    this.settings = { ...DEFAULT_SETTINGS }
    this.save()
    this._apply()
    StateBroadcaster.patch({ settings: { ...this.settings } })
    console.log('[Settings] Reset to defaults')
  }

  openDownloadsDir() {
    const dir = this.settings.downloads.defaultPath || app.getPath('downloads')
    // Check if directory exists before opening
    try {
      if (fs.existsSync(dir)) {
        shell.openPath(dir)
      } else {
        console.warn('[Settings] Downloads directory does not exist:', dir)
        // Fallback to default downloads folder
        const defaultDir = app.getPath('downloads')
        if (fs.existsSync(defaultDir)) {
          shell.openPath(defaultDir)
        }
      }
    } catch (err) {
      console.error('[Settings] Failed to open downloads directory:', err)
    }
  }

  save() {
    try {
      fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true })
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf-8')
    } catch (err) {
      console.error('[Settings] Failed to save:', err)
    }
  }

  /** Apply all settings to Electron subsystems */
  private _apply(section?: keyof VeilSettings, key?: string) {
    const s = this.settings

    // ── Downloads ──────────────────────────────────────────────────────────
    if (!section || section === 'downloads') {
      const downloadPath = s.downloads.defaultPath || app.getPath('downloads')
      session.defaultSession.setDownloadPath(downloadPath)
    }

    // ── Privacy / HTTPS upgrade ────────────────────────────────────────────
    if (!section || section === 'privacy') {
      // HTTPS upgrade: redirect http → https via webRequest intercept
      this._applyHttpsUpgrade(s.privacy.httpsUpgrade)

      // Adblock toggle
      if (this.adblock) {
        if (s.privacy.adblockEnabled) {
          this.adblock.enable()
        } else {
          this.adblock.disable()
        }
      }
    }

    // ── Appearance ─────────────────────────────────────────────────────────
    // accent color / blur are applied by the renderer via CSS vars when it
    // receives the settings patch — no Electron API needed here.
  }

  private _applyHttpsUpgrade(enabled: boolean) {
    this.httpsUpgradeEnabled = enabled
    // Re-register the webRequest handler with the new setting
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*'] },
      (details, callback) => {
        if (this.httpsUpgradeEnabled && details.url.startsWith('http://')) {
          try {
            const urlObj = new URL(details.url)
            // Skip localhost and known problematic domains
            if (urlObj.hostname === 'localhost' || 
                urlObj.hostname === '127.0.0.1' ||
                urlObj.hostname.endsWith('.local')) {
              return callback({})
            }
            const upgraded = details.url.replace(/^http:\/\//, 'https://')
            callback({ redirectURL: upgraded })
          } catch (err) {
            // If URL parsing fails, don't redirect
            console.warn('[Settings] Failed to parse URL for HTTPS upgrade:', details.url, err)
            callback({})
          }
        } else {
          callback({})
        }
      }
    )
  }

  private _initHttpsUpgrade() {
    this.httpsUpgradeEnabled = this.settings.privacy.httpsUpgrade
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mergeSettings(base: VeilSettings, override: Partial<VeilSettings>): VeilSettings {
  return {
    general:    { ...base.general,    ...(override.general ?? {}) },
    privacy:    { ...base.privacy,    ...(override.privacy ?? {}) },
    appearance: { ...base.appearance, ...(override.appearance ?? {}) },
    downloads:  { ...base.downloads,  ...(override.downloads ?? {}) },
  }
}
