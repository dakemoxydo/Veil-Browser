import { VeilSettings, DEFAULT_SETTINGS } from '@veil/shared';
import { ISettingsRepository } from '../../core/repositories/ISettingsRepository';
import { IPersistenceService } from '../../core/interfaces';

export class SettingsRepository implements ISettingsRepository {
  private settings: VeilSettings;

  constructor(private persistence: IPersistenceService) {
    this.settings = this.load();
  }

  private load(): VeilSettings {
    try {
      const saved = this.persistence.load<Partial<VeilSettings>>('settings.json', {});
      return {
        general: { ...DEFAULT_SETTINGS.general, ...saved.general },
        privacy: { ...DEFAULT_SETTINGS.privacy, ...saved.privacy },
        appearance: { ...DEFAULT_SETTINGS.appearance, ...saved.appearance },
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private save(): void {
    this.persistence.save('settings.json', this.settings);
  }

  get(): VeilSettings {
    return this.settings;
  }

  update(partial: Partial<VeilSettings>): void {
    this.settings = {
      general: { ...this.settings.general, ...partial.general },
      privacy: { ...this.settings.privacy, ...partial.privacy },
      appearance: { ...this.settings.appearance, ...partial.appearance },
    };
    this.save();
  }
}
