import { VeilService } from '../core/ServiceRegistry';
import { ILogger } from '../core/interfaces';
import { VeilAction } from '@veil/shared';

interface CertException {
  fingerprint: string;
  hostname: string;
}

interface SettingsServiceLike {
  getSettings(): { privacy: Record<string, unknown> };
}

/**
 * Manages certificate exceptions — allows users to bypass SSL errors
 * for specific certificates (e.g., self-signed).
 */
export class CertificateExceptionService implements VeilService {
  public name = 'CertificateExceptionService';
  private exceptions: CertException[] = [];

  constructor(
    private settingsService: SettingsServiceLike,
    private logger: ILogger,
  ) {}

  public async init() {
    this.logger.info('CertificateExceptionService initialized');
  }

  public isException(fingerprint: string): boolean {
    return this.exceptions.some(e => e.fingerprint === fingerprint);
  }

  public addException(fingerprint: string, hostname: string): void {
    if (!this.isException(fingerprint)) {
      this.exceptions.push({ fingerprint, hostname });
      this.logger.info(`Added certificate exception for ${hostname}`);
    }
  }

  public removeException(fingerprint: string): void {
    this.exceptions = this.exceptions.filter(e => e.fingerprint !== fingerprint);
    this.logger.info(`Removed certificate exception`);
  }

  public getExceptions(): CertException[] {
    return [...this.exceptions];
  }

  public async handleAction(action: VeilAction) {
    if (action.type === 'CERT_EXCEPTION_ADD' && action.payload) {
      this.addException(action.payload.fingerprint, action.payload.hostname);
    } else if (action.type === 'CERT_EXCEPTION_REMOVE' && action.payload) {
      this.removeException(action.payload.fingerprint);
    }
  }

  public destroy(): void {
    this.exceptions = [];
  }
}
