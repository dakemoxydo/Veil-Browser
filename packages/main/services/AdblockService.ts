import { session } from 'electron';
import { VeilAction } from '@veil/shared';
import { IEventBus, IErrorHandler, IStateBroadcaster, ILogger } from '../core/interfaces';
import { BaseService } from '../core/BaseService';

interface SettingsServiceLike {
  getSettings(): { privacy: { adblockEnabled: boolean } };
}

export class AdblockService extends BaseService {
  public name = 'AdblockService';
  private blockedCount = 0;
  private blockedCurrentPage = 0;
  private isEnabled = true;
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private settingsService: SettingsServiceLike,
    private stateBroadcaster: IStateBroadcaster,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger);
  }

  private blockList = [
    'doubleclick.net',
    'google-analytics.com',
    'facebook.com/tr',
    'ads-twitter.com'
  ];

  public async init() {
    this.isEnabled = this.settingsService.getSettings().privacy.adblockEnabled;
    this.setupInterceptor();
    this.logger.info('AdblockService initialized');
  }

  private setupInterceptor() {
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['<all_urls>'] },
      (details, callback) => {
        if (!this.isEnabled) {
          return callback({});
        }

        const url = details.url.toLowerCase();
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(url);
        } catch {
          return callback({});
        }

        const hostname = parsedUrl.hostname;
        const shouldBlock = this.blockList.some(domain =>
          hostname === domain || hostname.endsWith('.' + domain)
        );

        if (shouldBlock) {
          this.blockedCount++;
          this.blockedCurrentPage++;
          this.scheduleBroadcast();
          this.logger.debug(`Blocked: ${url}`);
          return callback({ cancel: true });
        }

        callback({});
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
    this.stateBroadcaster.patch({
      privacyStats: {
        blockedTotal: this.blockedCount,
        blockedCurrent: this.blockedCurrentPage,
      }
    });
  }

  public resetPageCount() {
    this.blockedCurrentPage = 0;
    this.broadcastStats();
  }

  public async handleAction(action: VeilAction) {
    if (action.type === 'ADBLOCK_TOGGLE') {
      this.isEnabled = !this.isEnabled;
      this.broadcastStats();
    } else if (action.type === 'SETTINGS_UPDATE' && action.payload.privacy) {
      if (action.payload.privacy.adblockEnabled !== undefined) {
        this.isEnabled = action.payload.privacy.adblockEnabled;
      }
    } else if (action.type === 'TAB_NAVIGATE') {
      this.resetPageCount();
    }
  }
}
