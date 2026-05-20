import * as crypto from 'crypto';
import { Credential, CredentialMeta } from '@veil/shared';
import { IEventBus, IErrorHandler, ILogger, IStateBroadcaster, IPersistenceService } from '../core/interfaces';
import { BaseService } from '../core/BaseService';

interface StoredCredential {
  id: string;
  url: string;
  username: string;
  encryptedPassword: string;
  iv: string;
  tag: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export class PasswordService extends BaseService {
  public name = 'PasswordService';
  private credentials: StoredCredential[] = [];
  private masterKey: Buffer | null = null;
  private unlocked = false;

  constructor(
    private persistence: IPersistenceService,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    logger: ILogger,
    stateBroadcaster?: IStateBroadcaster,
  ) {
    super(eventBus, errorHandler, logger, stateBroadcaster);
    this.loadCredentials();
  }

  public async init() {
    this.logger.info('PasswordService initialized');
  }

  private loadCredentials(): void {
    try {
      this.credentials = this.persistence.load<StoredCredential[]>('passwords.json', []);
    } catch {
      this.credentials = [];
    }
  }

  private saveCredentials(): void {
    this.persistence.save('passwords.json', this.credentials);
  }

  private deriveKey(passphrase: string): Buffer {
    // Derive a 256-bit key from the passphrase using scrypt
    const salt = 'veil-browser-password-salt-v1';
    return crypto.scryptSync(passphrase, salt, 32);
  }

  public async unlock(passphrase: string): Promise<boolean> {
    try {
      // Verify the passphrase by trying to decrypt a known value
      const key = this.deriveKey(passphrase);
      const testEncrypted = this.persistence.load<string>('password-verify.json', '');

      if (testEncrypted) {
        // Verify the master password by decrypting the verification token
        const parts = testEncrypted.split(':');
        if (parts.length !== 3) {
          return false;
        }
        const iv = Buffer.from(parts[0], 'hex');
        const tag = Buffer.from(parts[1], 'hex');
        const encrypted = Buffer.from(parts[2], 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        const verifyToken = decrypted.toString('utf-8');

        if (verifyToken !== 'veil-password-verify') {
          return false;
        }
      } else {
        // First time — create verification token
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update('veil-password-verify', 'utf-8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        const testValue = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
        this.persistence.save('password-verify.json', testValue);
      }

      this.masterKey = key;
      this.unlocked = true;
      this.logger.info('Password vault unlocked');
      return true;
    } catch (err) {
      this.logger.error('Failed to unlock password vault', err);
      return false;
    }
  }

  public lock(): void {
    this.masterKey = null;
    this.unlocked = false;
    this.logger.info('Password vault locked');
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  private encryptPassword(password: string): { encrypted: string; iv: string; tag: string } {
    if (!this.masterKey) throw new Error('Vault is locked');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    const encrypted = Buffer.concat([cipher.update(password, 'utf-8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      encrypted: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  private decryptPassword(stored: StoredCredential): string {
    if (!this.masterKey) throw new Error('Vault is locked');
    const iv = Buffer.from(stored.iv, 'hex');
    const tag = Buffer.from(stored.tag, 'hex');
    const encrypted = Buffer.from(stored.encryptedPassword, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf-8');
  }

  public list(): CredentialMeta[] {
    return this.credentials.map(c => ({
      id: c.id,
      url: c.url,
      username: c.username,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  public getById(id: string): Credential | null {
    const stored = this.credentials.find(c => c.id === id);
    if (!stored) return null;
    try {
      const password = this.decryptPassword(stored);
      return {
        id: stored.id,
        url: stored.url,
        username: stored.username,
        password,
        title: stored.title,
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt,
      };
    } catch {
      return null;
    }
  }

  public add(cred: { url: string; username: string; password: string; title: string }): Credential | null {
    if (!this.unlocked || !this.masterKey) return null;

    const { encrypted, iv, tag } = this.encryptPassword(cred.password);
    const now = Date.now();
    const stored: StoredCredential = {
      id: `cred-${now}-${Math.random().toString(36).slice(2, 8)}`,
      url: cred.url,
      username: cred.username,
      encryptedPassword: encrypted,
      iv,
      tag,
      title: cred.title,
      createdAt: now,
      updatedAt: now,
    };

    this.credentials.push(stored);
    this.saveCredentials();

    return {
      id: stored.id,
      url: stored.url,
      username: stored.username,
      password: cred.password,
      title: stored.title,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }

  public update(id: string, updates: Partial<{ url: string; username: string; password: string; title: string }>): boolean {
    if (!this.unlocked || !this.masterKey) return false;

    const idx = this.credentials.findIndex(c => c.id === id);
    if (idx === -1) return false;

    const stored = this.credentials[idx];
    if (updates.url !== undefined) stored.url = updates.url;
    if (updates.username !== undefined) stored.username = updates.username;
    if (updates.title !== undefined) stored.title = updates.title;
    if (updates.password !== undefined) {
      const { encrypted, iv, tag } = this.encryptPassword(updates.password);
      stored.encryptedPassword = encrypted;
      stored.iv = iv;
      stored.tag = tag;
    }
    stored.updatedAt = Date.now();

    this.saveCredentials();
    return true;
  }

  public delete(id: string): boolean {
    const idx = this.credentials.findIndex(c => c.id === id);
    if (idx === -1) return false;
    this.credentials.splice(idx, 1);
    this.saveCredentials();
    return true;
  }

  public destroy(): void {
    this.lock();
  }
}
