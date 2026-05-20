import { VeilAction } from '@veil/shared';
import { ILogger } from '../core/interfaces';
import { ISession } from '../core/ports/ISession';
import { VeilService } from '../core/ServiceRegistry';

interface SettingsServiceLike {
  getSettings(): {
    privacy: {
      httpsUpgrade: boolean;
    };
  };
}

/**
 * Upgrades HTTP requests to HTTPS for known sites that support it.
 * Does not break HTTP-only sites — only upgrades domains in the known list.
 */
export class HttpsUpgradeService implements VeilService {
  public name = 'HttpsUpgradeService';
  private httpsEnabled = true;
  private upgradeCount = 0;

  constructor(
    private session: ISession,
    private settingsService: SettingsServiceLike,
    private logger: ILogger,
  ) {}

  /**
   * Major domains known to support HTTPS.
   * Only requests to these domains will be upgraded from HTTP to HTTPS.
   */
  private httpsDomains: Set<string> = new Set([
    // Search engines
    'google.com',
    'bing.com',
    'duckduckgo.com',
    'brave.com',
    'yahoo.com',
    'ecosia.org',
    // Social media
    'facebook.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'linkedin.com',
    'reddit.com',
    'pinterest.com',
    'tumblr.com',
    'tiktok.com',
    'snapchat.com',
    'threads.net',
    'mastodon.social',
    // Video / streaming
    'youtube.com',
    'netflix.com',
    'twitch.tv',
    'vimeo.com',
    'dailymotion.com',
    'spotify.com',
    // Tech / developer
    'github.com',
    'gitlab.com',
    'stackoverflow.com',
    'stackexchange.com',
    'mozilla.org',
    'developer.mozilla.org',
    'w3.org',
    'npmjs.com',
    'npm.io',
    'docker.com',
    'digitalocean.com',
    'cloudflare.com',
    'vercel.com',
    'netlify.com',
    // News / media
    'bbc.com',
    'bbc.co.uk',
    'cnn.com',
    'nytimes.com',
    'washingtonpost.com',
    'theguardian.com',
    'reuters.com',
    'apnews.com',
    'bloomberg.com',
    'wsj.com',
    'wired.com',
    'arstechnica.com',
    'theverge.com',
    // Shopping / commerce
    'amazon.com',
    'amazon.co.uk',
    'amazon.de',
    'ebay.com',
    'etsy.com',
    'shopify.com',
    'walmart.com',
    'target.com',
    'bestbuy.com',
    'aliexpress.com',
    // Reference
    'wikipedia.org',
    'wikimedia.org',
    'archive.org',
    'medium.com',
    'substack.com',
    // Communication
    'outlook.com',
    'live.com',
    'gmail.com',
    'mail.google.com',
    'proton.me',
    'protonmail.com',
    'signal.org',
    'telegram.org',
    'whatsapp.com',
    'discord.com',
    'slack.com',
    'zoom.us',
    'teams.microsoft.com',
    // Cloud / productivity
    'microsoft.com',
    'office.com',
    'office365.com',
    'onedrive.live.com',
    'apple.com',
    'icloud.com',
    'dropbox.com',
    'drive.google.com',
    'docs.google.com',
    'notion.so',
    'trello.com',
    'atlassian.com',
    'jira.atlassian.com',
    'confluence.atlassian.com',
    // Finance
    'paypal.com',
    'stripe.com',
    'wise.com',
    'revolut.com',
    'coinbase.com',
    'binance.com',
    // Government / org
    'usa.gov',
    'gov.uk',
    'europa.eu',
  ]);

  public async init() {
    this.httpsEnabled = this.settingsService.getSettings().privacy.httpsUpgrade;
    this.setupInterceptor();
    this.logger.info('HttpsUpgradeService initialized');
  }

  private setupInterceptor() {
    this.session.onBeforeRequest(
      { urls: ['http://*/*'] },
      (details, callback) => {
        if (!this.httpsEnabled) {
          return callback({ cancel: false });
        }

        const url = details.url;
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(url);
        } catch {
          return callback({ cancel: false });
        }

        // Only upgrade HTTP to HTTPS
        if (parsedUrl.protocol !== 'http:') {
          return callback({ cancel: false });
        }

        const hostname = parsedUrl.hostname;

        // Check if the hostname or any parent domain is in our HTTPS list
        if (this.isHttpsSupported(hostname)) {
          parsedUrl.protocol = 'https:';
          const httpsUrl = parsedUrl.toString();
          this.upgradeCount++;
          this.logger.debug(`HTTPS upgrade: ${url} -> ${httpsUrl}`);
          return callback({ cancel: false, redirectURL: httpsUrl });
        }

        callback({ cancel: false });
      }
    );
  }

  /**
   * Check if a hostname or its parent domain supports HTTPS.
   */
  private isHttpsSupported(hostname: string): boolean {
    // Direct match
    if (this.httpsDomains.has(hostname)) {
      return true;
    }
    // Check parent domains (e.g. "www.google.com" matches "google.com")
    const parts = hostname.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const parentDomain = parts.slice(i).join('.');
      if (this.httpsDomains.has(parentDomain)) {
        return true;
      }
    }
    return false;
  }

  public async handleAction(action: VeilAction) {
    if (action.type === 'SETTINGS_UPDATE' && action.payload?.privacy) {
      if (action.payload.privacy.httpsUpgrade !== undefined) {
        this.httpsEnabled = action.payload.privacy.httpsUpgrade;
      }
    }
  }

  public getUpgradesCount(): number { return this.upgradeCount; }

  public destroy(): void {
    // No cleanup needed — the request interceptor remains registered
    // but respects the httpsEnabled flag.
  }
}
