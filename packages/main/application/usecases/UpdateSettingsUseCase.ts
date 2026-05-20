import { VeilSettings } from '@veil/shared';
import { ISettingsRepository } from '../../core/repositories/ISettingsRepository';

/**
 * Updates application settings.
 */
export class UpdateSettingsUseCase {
  constructor(private readonly settingsRepo: ISettingsRepository) {}

  execute(partial: Partial<VeilSettings>): VeilSettings {
    this.settingsRepo.update(partial);
    return this.settingsRepo.get();
  }
}
