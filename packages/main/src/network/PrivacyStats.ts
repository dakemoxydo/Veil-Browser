import { StateBroadcaster } from '../ipc/StateBroadcaster'
import type { PrivacyStats } from '@veil/shared'
import { IPC_PRIVACY } from '@veil/shared'

/**
 * PrivacyStatsService — counts blocked requests per tab and session-wide.
 * Updated by AdblockEngine on each blocked request.
 */
export class PrivacyStatsService {
  private stats: PrivacyStats = {
    totalBlocked: 0,
    trackersBlocked: 0,
    adsBlocked: 0,
    perTab: {},
  }

  increment(tabId?: string) {
    this.stats.totalBlocked++
    if (tabId) {
      this.stats.perTab[tabId] = (this.stats.perTab[tabId] ?? 0) + 1
    }
    StateBroadcaster.emit(IPC_PRIVACY, {
      totalBlocked: this.stats.totalBlocked,
      perTab: this.stats.perTab,
    })
    StateBroadcaster.patch({
      privacyStats: { ...this.stats },
    })
  }

  clearTab(tabId: string) {
    if (this.stats.perTab[tabId]) {
      delete this.stats.perTab[tabId]
      StateBroadcaster.emit(IPC_PRIVACY, {
        totalBlocked: this.stats.totalBlocked,
        perTab: this.stats.perTab,
      })
      StateBroadcaster.patch({
        privacyStats: { ...this.stats },
      })
    }
  }

  reset() {
    this.stats = { totalBlocked: 0, trackersBlocked: 0, adsBlocked: 0, perTab: {} }
  }

  get(): PrivacyStats {
    return { ...this.stats }
  }
}

