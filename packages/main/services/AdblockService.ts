import { VeilAction } from '@veil/shared';
import { IEventBus, IErrorHandler, IStateBroadcaster, ILogger } from '../core/interfaces';
import { ISession } from '../core/ports/ISession';
import { BaseService } from '../core/BaseService';

interface SettingsServiceLike {
  getSettings(): {
    privacy: {
      adblockEnabled: boolean;
      blockTrackers: boolean;
      doNotTrack: boolean;
    };
  };
}

export class AdblockService extends BaseService {
  public name = 'AdblockService';
  private blockedCount = 0;
  private blockedCurrentPage = 0;
  private blockedAds = 0;
  private blockedTrackers = 0;
  private topDomains = new Map<string, number>();
  private adblockEnabled = true;
  private blockTrackers = true;
  private doNotTrack = true;
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;
  private customDomains = new Set<string>();
  private customListUrls: string[] = [];

  constructor(
    private session: ISession,
    private settingsService: SettingsServiceLike,
    stateBroadcaster: IStateBroadcaster,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger, stateBroadcaster);
  }

  /** Domains used for ad serving */
  private adBlockSet = new Set([
    'doubleclick.net', 'googlesyndication.com', 'ads.google.com',
    'amazon-adsystem.com', 'ads-twitter.com', 'connect.facebook.net',
    'outbrain.com', 'taboola.com', 'criteo.com',
    'adnxs.com', 'adsrvr.org', 'adcolony.com', 'appsflyer.com',
    'moat.com', 'serving-sys.com', 'sizmek.com', 'mediamath.com',
    'rubiconproject.com', 'pubmatic.com', 'openx.net', 'casalemedia.com',
    'turn.com', 'bidswitch.net', 'contextweb.com', 'sharethrough.com',
    'spotxchange.com', 'teads.tv', 'tribalfusion.com', 'yieldmo.com',
    'adform.net', 'adroll.com', 'brealtime.com', 'chango.com',
    'connexity.com', 'crwdcntrl.net', 'dotomi.com', 'everesttech.net',
    'exelator.com', 'eyeota.net', 'flashtalking.com', 'gumgum.com',
    'indexww.com', 'insurads.com', 'lijit.com', 'liveintent.com',
    'mookie1.com', 'narrativ.com', 'nativo.com', 'netmng.com',
    'nitropay.com', 'permutive.com', 'pippio.com', 'prebid.org',
    'rlcdn.com', 'rtbhouse.com', 'sharethis.com', 'smartadserver.com',
    'sonobi.com', 'stickyadstv.com', 'tremorhub.com', 'undertone.com',
    'vidible.tv', 'yieldlab.net', 'zedo.com', 'zemanta.com',
  ]);

  /** Domains used for user tracking / analytics */
  private trackerSet = new Set([
    'google-analytics.com', 'googletagmanager.com', 'facebook.com/tr',
    'twitter.com/i/adsct', 'hotjar.com', 'mixpanel.com', 'segment.com',
    'amplitude.com', 'scorecardresearch.com', 'quantserve.com',
    'newrelic.com', 'nr-data.net', 'matomo.org', 'piwik.net',
    'clarity.ms', 'mouseflow.com', 'fullstory.com', 'heap.io',
    'pendo.io', 'intercom.io',
    'branch.io', 'bugsnag.com', 'chartbeat.com', 'clevertap.com',
    'countly.com', 'crashlytics.com', 'customer.io', 'databrain.com',
    'datadog.com', 'demandbase.com', 'dynatrace.com', 'elastic.co',
    'engagio.com', 'facebook.net', 'gemius.com', 'getblueshift.com',
    'github.com/collect', 'honeybadger.io', 'hubspot.com', 'inspectlet.com',
    'ipinfo.io', 'keen.io', 'kissmetrics.com', 'launchdarkly.com',
    'leanplum.com', 'localytics.com', 'logrocket.com', 'marketo.com',
    'moengage.com', 'optimizely.com', 'osano.com', 'pendo.io',
    'qualaroo.com', 'qualtrics.com', 'quantcast.com', 'rollbar.com',
    'segment.io', 'sentry.io', 'snapengage.com', 'stats.wp.com',
    'statuspage.io', 'sumo.com', 'taplytics.com', 'tealiumiq.com',
    'totango.com', 'trackjs.com', 'usabilla.com', 'usercycle.com',
    'userzoom.com', 'vwo.com', 'woopra.com', 'wootric.com',
    'abtasty.com', 'bazaarvoice.com', 'blueconic.com', 'bownow.com',
    'calltrk.com', 'callrail.com', 'cdn.segment.com', 'clicktale.com',
    'convert.com', 'crazyegg.com', 'evergage.com', 'foresee.com',
    'go-mpulse.net', 'gtag.js', 'heapanalytics.com', 'hs-analytics.net',
    'hsadspixel.net', 'intercomcdn.com', 'kameleoon.com', 'leadfeeder.com',
    'luckyorange.com', 'mouseflow.com', 'nerdwallet.com', 'onetrust.com',
    'pingdom.net', 'plausible.io', 'rudderstack.com', 'scarf.sh',
    'segmentify.com', 'snap.licdn.com', 'statcounter.com', 'survicate.com',
    't.co', 'tracking.feedpress.it', 'trkn.us', 'unpkg.com/@sentry',
    'userreport.com', 'vimeo.com/api', 'webtrekk.net', 'yandex.ru/metrika',
  ]);

  public async init() {
    const privacy = this.settingsService.getSettings().privacy;
    this.adblockEnabled = privacy.adblockEnabled;
    this.blockTrackers = privacy.blockTrackers;
    this.doNotTrack = privacy.doNotTrack;

    this.setupInterceptor();
    this.setupDNT();
    this.logger.info('AdblockService initialized');
  }

  private setupInterceptor() {
    this.session.onBeforeRequest(
      { urls: ['<all_urls>'] },
      (details, callback) => {
        // If both ad blocking and tracker blocking are disabled, pass through
        if (!this.adblockEnabled && !this.blockTrackers) {
          return callback({ cancel: false });
        }

        const url = details.url.toLowerCase();
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(url);
        } catch {
          return callback({ cancel: false });
        }

        const hostname = parsedUrl.hostname;

        // Check ad block list (controlled by adblockEnabled)
        if (this.adblockEnabled) {
          const isAd = this.adBlockSet.has(hostname);
          if (isAd) {
            this.blockedCount++;
            this.blockedCurrentPage++;
            this.blockedAds++;
            this.topDomains.set(hostname, (this.topDomains.get(hostname) || 0) + 1);
            this.scheduleBroadcast();
            this.logger.debug(`Blocked ad: ${url}`);
            return callback({ cancel: true });
          }
        }

        // Check tracker list (controlled by blockTrackers)
        if (this.blockTrackers) {
          const hostnameWithPath = hostname + parsedUrl.pathname;
          const isTracker = this.trackerSet.has(hostname) || this.trackerSet.has(hostnameWithPath);
          if (isTracker) {
            this.blockedCount++;
            this.blockedCurrentPage++;
            this.blockedTrackers++;
            this.topDomains.set(hostname, (this.topDomains.get(hostname) || 0) + 1);
            this.scheduleBroadcast();
            this.logger.debug(`Blocked tracker: ${url}`);
            return callback({ cancel: true });
          }
        }

        // Check custom adblock lists
        if (this.customDomains.has(hostname)) {
          this.blockedCount++;
          this.blockedCurrentPage++;
          this.blockedAds++;
          this.topDomains.set(hostname, (this.topDomains.get(hostname) || 0) + 1);
          this.scheduleBroadcast();
          this.logger.debug(`Blocked by custom list: ${url}`);
          return callback({ cancel: true });
        }

        callback({ cancel: false });
      }
    );
  }

  private setupDNT() {
    this.session.onBeforeSendHeaders(
      { urls: ['<all_urls>'] },
      (details, callback) => {
        if (this.doNotTrack) {
          callback({ requestHeaders: { ...details.requestHeaders, DNT: '1' } });
        } else {
          callback({ requestHeaders: details.requestHeaders });
        }
      }
    );
  }

  private scheduleBroadcast() {
    if (this.broadcastTimer) return;
    this.broadcastTimer = setTimeout(() => {
      this.broadcastTimer = null;
      this.broadcastStats();
    }, 100);
  }

  private broadcastStats() {
    this.stateBroadcaster!.patch({
      privacyStats: {
        blockedTotal: this.blockedCount,
        blockedCurrent: this.blockedCurrentPage,
        blockedAds: this.blockedAds,
        blockedTrackers: this.blockedTrackers,
        httpsUpgrades: 0,
        cookiesBlocked: 0,
      }
    });
  }

  public getBlockedAdsCount(): number { return this.blockedAds; }
  public getBlockedTrackersCount(): number { return this.blockedTrackers; }
  public getTopBlockedDomains(): { domain: string; count: string }[] {
    return Array.from(this.topDomains.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count: String(count) }));
  }

  public resetPageCount() {
    this.blockedCurrentPage = 0;
    this.broadcastStats();
  }

  public async handleAction(action: VeilAction) {
    if (action.type === 'ADBLOCK_TOGGLE') {
      this.adblockEnabled = !this.adblockEnabled;
      this.broadcastStats();
    } else if (action.type === 'SETTINGS_UPDATE' && action.payload?.privacy) {
      const privacy = action.payload.privacy;
      if (privacy.adblockEnabled !== undefined) {
        this.adblockEnabled = privacy.adblockEnabled;
      }
      if (privacy.blockTrackers !== undefined) {
        this.blockTrackers = privacy.blockTrackers;
      }
      if (privacy.doNotTrack !== undefined) {
        this.doNotTrack = privacy.doNotTrack;
      }
    } else if (action.type === 'TAB_NAVIGATE' || action.type === 'TAB_FOCUS') {
      this.resetPageCount();
    }
  }

  /**
   * Parse an ABP/easylist format filter list and extract domain-based block rules.
   * Simplified parser: extracts ||domain^ patterns as domain blocks.
   */
  public parseEasyList(content: string): string[] {
    const domains: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) continue;

      // Match ||domain^ pattern (ABP domain block syntax)
      const domainMatch = trimmed.match(/^\|\|([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\^?/);
      if (domainMatch) {
        const domain = domainMatch[1].toLowerCase();
        // Skip overly broad rules (single-part domains)
        if (domain.includes('.')) {
          domains.push(domain);
        }
      }
    }

    return [...new Set(domains)]; // Deduplicate
  }

  /**
   * Fetch and parse a filter list from a URL.
   */
  public async loadCustomList(url: string): Promise<string[]> {
    try {
      // Validate URL
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('Invalid protocol');
      }

      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { 'Accept': 'text/plain' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const content = await response.text();
      const domains = this.parseEasyList(content);

      this.logger.info(`Loaded ${domains.length} domains from custom list: ${url}`);

      return domains;
    } catch (err) {
      this.logger.error(`Failed to load custom list from ${url}`, err);
      return [];
    }
  }

  /**
   * Add a custom adblock list URL, fetch it, and merge domains into the custom set.
   */
  public async addCustomList(url: string): Promise<boolean> {
    // Check if already exists
    if (this.customListUrls.includes(url)) {
      return true;
    }

    const domains = await this.loadCustomList(url);
    if (domains.length === 0) {
      return false;
    }

    // Add domains to the custom set
    for (const domain of domains) {
      this.customDomains.add(domain);
    }

    this.customListUrls.push(url);
    this.logger.info(`Added custom list: ${url} (${domains.length} domains, total: ${this.customDomains.size})`);

    return true;
  }

  /**
   * Remove a custom adblock list URL and reload remaining lists.
   */
  public async removeCustomList(url: string): Promise<boolean> {
    const idx = this.customListUrls.indexOf(url);
    if (idx === -1) return false;

    this.customListUrls.splice(idx, 1);

    // Rebuild custom domains from remaining lists
    this.customDomains.clear();
    for (const listUrl of this.customListUrls) {
      const domains = await this.loadCustomList(listUrl);
      for (const domain of domains) {
        this.customDomains.add(domain);
      }
    }

    this.logger.info(`Removed custom list: ${url} (remaining domains: ${this.customDomains.size})`);
    return true;
  }

  /**
   * Get the list of custom adblock list URLs.
   */
  public getCustomLists(): string[] {
    return [...this.customListUrls];
  }

  /**
   * Initialize custom lists from settings on startup.
   */
  public async loadCustomListsFromSettings(): Promise<void> {
    const settings = this.settingsService.getSettings();
    const lists = (settings.privacy as Record<string, unknown>).customAdblockLists as string[] | undefined;
    if (!lists || lists.length === 0) return;

    for (const url of lists) {
      const domains = await this.loadCustomList(url);
      for (const domain of domains) {
        this.customDomains.add(domain);
      }
      this.customListUrls.push(url);
    }

    this.logger.info(`Loaded ${this.customListUrls.length} custom adblock lists (${this.customDomains.size} domains)`);
  }

  public destroy(): void {
    if (this.broadcastTimer) {
      clearTimeout(this.broadcastTimer);
      this.broadcastTimer = null;
    }
  }
}
