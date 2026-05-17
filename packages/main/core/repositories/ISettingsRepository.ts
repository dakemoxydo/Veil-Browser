import { VeilSettings } from '@veil/shared';

export interface ISettingsRepository {
  get(): VeilSettings;
  update(partial: Partial<VeilSettings>): void;
}
