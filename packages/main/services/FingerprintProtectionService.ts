import * as path from 'path';
import { VeilAction } from '@veil/shared';
import { IEventBus, IErrorHandler, ILogger } from '../core/interfaces';
import { ISession } from '../core/ports/ISession';
import { BaseService } from '../core/BaseService';

interface SettingsServiceLike {
  getSettings(): { privacy: { fingerprintProtection: boolean } };
}

export class FingerprintProtectionService extends BaseService {
  public name = 'FingerprintProtection';
  private isEnabled = false;

  constructor(
    private session: ISession,
    private settingsService: SettingsServiceLike,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    logger: ILogger,
  ) {
    super(eventBus, errorHandler, logger);
  }

  public async init() {
    this.isEnabled = this.settingsService.getSettings().privacy.fingerprintProtection;
    if (this.isEnabled) {
      this.enableProtection();
    }
    this.logger.info('FingerprintProtection initialized');
  }

  /** Enable protection via session-level preload script (A29) */
  private enableProtection(): void {
    const scriptPath = path.join(__dirname, 'fingerprint-preload.js');
    this.session.setPreloads([scriptPath]);
    this.logger.info('Fingerprint protection enabled via session preload');
  }

  /** Disable protection by clearing session preloads */
  private disableProtection(): void {
    this.session.setPreloads([]);
    this.logger.info('Fingerprint protection disabled');
  }

  public async handleAction(action: VeilAction) {
    if (action.type === 'SETTINGS_UPDATE' && action.payload?.privacy?.fingerprintProtection !== undefined) {
      this.isEnabled = action.payload.privacy.fingerprintProtection;
      if (this.isEnabled) {
        this.enableProtection();
      } else {
        this.disableProtection();
      }
    }
  }

  public destroy(): void {
    this.disableProtection();
  }
}
