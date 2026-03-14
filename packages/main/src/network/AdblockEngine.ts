import { session } from "electron"
import { ElectronBlocker } from "@cliqz/adblocker-electron"
import fetch from "cross-fetch"
import { StateBroadcaster } from "../ipc/StateBroadcaster"
import { IPC_PRIVACY } from "@veil/shared"
import type { PrivacyStatsService } from "./PrivacyStats"

export class AdblockEngine {
  private blocker: ElectronBlocker | null = null
  private _whitelist = new Set<string>()
  private _enabled = true
  private _targetSession = session.defaultSession
  private privacyStats: PrivacyStatsService | null = null

  constructor(privacyStats?: PrivacyStatsService) {
    this.privacyStats = privacyStats ?? null
  }

  attachPrivacyStats(stats: PrivacyStatsService) {
    this.privacyStats = stats
  }

  async init(targetSession = session.defaultSession) {
    if (!this._targetSession || this._targetSession === session.defaultSession) {
      this._targetSession = targetSession
    }

    try {
      this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch as any)
      this.blocker.enableBlockingInSession(this._targetSession)

      this.blocker.on("request-blocked", (request: any) => {
        if (this._isWhitelisted(request.url)) return

        // Note: AdblockEngine doesn't have access to tabId here
        // Per-tab stats would require webRequest API integration
        if (this.privacyStats) {
          this.privacyStats.increment()
        }
        console.log("[AdblockEngine] Blocked:", request.url)
      })

      console.log("[AdblockEngine] Initialized with prebuilt filter lists.")
    } catch (err) {
      console.error("[AdblockEngine] Failed to initialize:", err)
    }
  }

  enable() {
    if (!this._enabled && this.blocker) {
      this.blocker.enableBlockingInSession(this._targetSession)
      this._enabled = true
      console.log("[AdblockEngine] Enabled")
    }
  }

  disable() {
    if (this._enabled && this.blocker) {
      this.blocker.disableBlockingInSession(this._targetSession)
      this._enabled = false
      console.log("[AdblockEngine] Disabled")
    }
  }

  addToWhitelist(hostname: string) {
    this._whitelist.add(hostname)
    console.log("[AdblockEngine] Whitelisted: " + hostname)
  }

  removeFromWhitelist(hostname: string) {
    this._whitelist.delete(hostname)
    console.log("[AdblockEngine] Removed from whitelist: " + hostname)
  }

  isWhitelisted(hostname: string): boolean {
    return this._whitelist.has(hostname)
  }

  private _isWhitelisted(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return this._whitelist.has(urlObj.hostname)
    } catch {
      return false
    }
  }

  isEnabled(): boolean { 
    return this._enabled && this.blocker !== null 
  }
}
