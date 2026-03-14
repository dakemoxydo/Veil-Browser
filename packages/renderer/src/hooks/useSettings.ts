import { useCallback } from 'react'
import { useVeilStore } from '../store/useVeilStore'
import { useIPC } from './useIPC'
import type { SettingsPath, SettingsValue } from '@veil/shared'

/**
 * useSettings — reads settings from Zustand store and provides typed update helper.
 * All writes go through IPC → SettingsManager → persist + apply.
 */
export function useSettings() {
  const settings = useVeilStore(s => s.settings)
  const { dispatch } = useIPC()

  const update = useCallback(<T extends SettingsPath>(path: T, value: SettingsValue<T>) => {
    dispatch({ type: 'SETTINGS_UPDATE', payload: { path, value } })
  }, [dispatch])

  const reset = useCallback(() => {
    dispatch({ type: 'SETTINGS_RESET' })
  }, [dispatch])

  const openDownloadsDir = useCallback(() => {
    dispatch({ type: 'SETTINGS_OPEN_DOWNLOADS_DIR' })
  }, [dispatch])

  return { settings, update, reset, openDownloadsDir }
}
