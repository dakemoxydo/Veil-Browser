import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { Profile } from '@veil/shared';
import { IEventBus, IErrorHandler, ILogger, IStateBroadcaster, IPersistenceService } from '../core/interfaces';
import { BaseService } from '../core/BaseService';

export class ProfileService extends BaseService {
  public name = 'ProfileService';
  private profiles: Profile[] = [];
  private currentProfileId: string = 'default';

  constructor(
    private persistence: IPersistenceService,
    eventBus: IEventBus,
    errorHandler: IErrorHandler,
    logger: ILogger,
    stateBroadcaster?: IStateBroadcaster,
  ) {
    super(eventBus, errorHandler, logger, stateBroadcaster);
    this.loadProfiles();
  }

  public async init() {
    this.logger.info('ProfileService initialized');
  }

  private getProfilesPath(): string {
    return path.join(app.getPath('userData'), 'VeilBrowser', 'profiles.json');
  }

  private loadProfiles(): void {
    try {
      const profilesPath = this.getProfilesPath();
      if (fs.existsSync(profilesPath)) {
        const data = fs.readFileSync(profilesPath, 'utf-8');
        this.profiles = JSON.parse(data);
      }
    } catch {
      this.profiles = [];
    }

    // Ensure default profile exists
    if (!this.profiles.find(p => p.isDefault)) {
      this.profiles.unshift({
        id: 'default',
        name: 'Default',
        dataDir: path.join(app.getPath('userData'), 'VeilBrowser'),
        isDefault: true,
      });
      this.saveProfiles();
    }
  }

  private saveProfiles(): void {
    try {
      const profilesPath = this.getProfilesPath();
      const dir = path.dirname(profilesPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(profilesPath, JSON.stringify(this.profiles, null, 2), 'utf-8');
    } catch (err) {
      this.logger.error('Failed to save profiles', err);
    }
  }

  public list(): Profile[] {
    return this.profiles;
  }

  public getCurrentProfileId(): string {
    return this.currentProfileId;
  }

  public create(name: string): Profile | null {
    if (!name || typeof name !== 'string' || name.trim().length === 0) return null;

    const id = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const dataDir = path.join(app.getPath('userData'), 'VeilBrowser', `profiles-${id}`);

    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    } catch (err) {
      this.logger.error('Failed to create profile directory', err);
      return null;
    }

    const profile: Profile = {
      id,
      name: name.trim().slice(0, 100),
      dataDir,
      isDefault: false,
    };

    this.profiles.push(profile);
    this.saveProfiles();

    return profile;
  }

  public async switchTo(id: string): Promise<boolean> {
    const profile = this.profiles.find(p => p.id === id);
    if (!profile) return false;

    // Save current state before switching
    this.persistence.flush();

    // Set the current profile
    this.currentProfileId = id;

    // Restart the app with the new profile data directory
    // Note: In a real implementation, this would restart the app with --profile flag
    // For now, we just log the switch
    this.logger.info(`Switching to profile: ${profile.name} (${profile.dataDir})`);

    // Trigger app restart
    app.relaunch({ args: [`--profile=${id}`] });
    app.exit(0);

    return true;
  }

  public delete(id: string): boolean {
    const idx = this.profiles.findIndex(p => p.id === id);
    if (idx === -1) return false;

    // Cannot delete default profile
    if (this.profiles[idx].isDefault) {
      this.logger.warn('Cannot delete default profile');
      return false;
    }

    // Cannot delete current profile
    if (this.profiles[idx].id === this.currentProfileId) {
      this.logger.warn('Cannot delete currently active profile');
      return false;
    }

    const profile = this.profiles[idx];

    // Try to remove profile data directory
    try {
      if (fs.existsSync(profile.dataDir)) {
        fs.rmSync(profile.dataDir, { recursive: true, force: true });
      }
    } catch (err) {
      this.logger.warn('Failed to remove profile data directory', err);
    }

    this.profiles.splice(idx, 1);
    this.saveProfiles();

    return true;
  }

  public destroy(): void {
    // Nothing to clean up
  }
}
