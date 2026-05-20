import { VeilAction } from '@veil/shared';
import { ILogger } from '../core/interfaces';
import { ISession } from '../core/ports/ISession';
import { VeilService } from '../core/ServiceRegistry';

interface SettingsServiceLike {
  getSettings(): {
    privacy: {
      blockThirdPartyCookies: boolean;
      clearCookiesOnStart: boolean;
    };
  };
}

/**
 * Manages cookie privacy: blocks third-party cookies and
 * optionally clears all cookies on application start.
 */
export class CookieService implements VeilService {
  public name = 'CookieService';
  private blockThirdPartyCookies = true;
  private blockedCount = 0;
  // Map tabId -> domain for per-tab tracking
  private tabDomains = new Map<string, string>();
  private cleanupCookieListener: (() => void) | null = null;

  constructor(
    private session: ISession,
    private settingsService: SettingsServiceLike,
    private logger: ILogger,
  ) {}

  public async init() {
    const privacy = this.settingsService.getSettings().privacy;
    this.blockThirdPartyCookies = privacy.blockThirdPartyCookies;

    if (privacy.clearCookiesOnStart) {
      await this.clearAllCookies();
    }

    this.setupCookieMonitor();
    this.logger.info('CookieService initialized');
  }

  private setupCookieMonitor() {
    this.cleanupCookieListener = this.session.onCookiesChanged(
      async (event) => {
        if (event.removed) return;
        if (!this.blockThirdPartyCookies) return;

        const { cookie } = event;
        // Check against all active tab domains
        if (this.tabDomains.size > 0 && this.isThirdParty(cookie.domain)) {
          try {
            const protocol = 'https://';
            const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
            const url = protocol + domain + cookie.path;
            await this.session.removeCookie(url, cookie.name);
            this.blockedCount++;
            this.logger.debug(`Removed third-party cookie: ${cookie.name} (${cookie.domain})`);
          } catch {
            // Cookie may have already been removed
          }
        }
      },
    );
  }

  private isThirdParty(cookieDomain: string): boolean {
    const normalized = cookieDomain.startsWith('.') ? cookieDomain.slice(1) : cookieDomain;

    for (const tabDomain of this.tabDomains.values()) {
      if (
        normalized === tabDomain ||
        normalized.endsWith('.' + tabDomain) ||
        tabDomain.endsWith('.' + normalized)
      ) {
        return false;
      }
    }
    return true;
  }

  public async clearAllCookies(): Promise<void> {
    try {
      await this.session.clearAllCookies();
      this.logger.info('All cookies cleared');
    } catch (error) {
      this.logger.error('Failed to clear cookies', error);
    }
  }

  public async handleAction(action: VeilAction) {
    if (action.type === 'SETTINGS_UPDATE' && action.payload?.privacy) {
      const privacy = action.payload.privacy;
      if (privacy.blockThirdPartyCookies !== undefined) {
        this.blockThirdPartyCookies = privacy.blockThirdPartyCookies;
      }
    } else if (action.type === 'TAB_NAVIGATE' && action.payload?.id && action.payload?.url) {
      try {
        const hostname = new URL(action.payload.url).hostname;
        this.tabDomains.set(action.payload.id, hostname);
      } catch { /* invalid URL in TAB_NEW payload */ }
    } else if (action.type === 'TAB_CLOSE' && action.payload?.id) {
      this.tabDomains.delete(action.payload.id);
    }
  }

  public getBlockedCount(): number { return this.blockedCount; }

  public destroy(): void {
    if (this.cleanupCookieListener) {
      this.cleanupCookieListener();
      this.cleanupCookieListener = null;
    }
  }
}
