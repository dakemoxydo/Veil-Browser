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
        proxy: { ...DEFAULT_SETTINGS.proxy, ...saved.proxy },
      };
    } catch (e) {
      console.warn('[SettingsRepository] Failed to parse saved settings, using defaults:', e);
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
    // Deep merge: only overwrite provided keys within each section
    const merged: VeilSettings = {
      general: partial.general
        ? { ...this.settings.general, ...partial.general }
        : { ...this.settings.general },
      privacy: partial.privacy
        ? { ...this.settings.privacy, ...partial.privacy }
        : { ...this.settings.privacy },
      appearance: partial.appearance
        ? { ...this.settings.appearance, ...partial.appearance }
        : { ...this.settings.appearance },
      proxy: partial.proxy
        ? { ...this.settings.proxy, ...partial.proxy }
        : { ...this.settings.proxy },
    };
    this.settings = merged;
    this.save();
  }
}
