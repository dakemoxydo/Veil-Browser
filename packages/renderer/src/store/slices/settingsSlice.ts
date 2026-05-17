import { StateCreator } from 'zustand';
import { VeilSettings, DEFAULT_SETTINGS } from '@veil/shared';

export interface SettingsSlice {
  settings: VeilSettings;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = () => ({
  settings: { ...DEFAULT_SETTINGS },
});
