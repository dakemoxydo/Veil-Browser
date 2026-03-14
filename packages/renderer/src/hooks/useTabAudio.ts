import { useCallback } from 'react'
import type { AudioData } from '@veil/shared/state'
import { useVeilStore } from '../store/useVeilStore'

/**
 * useTabAudio — subscribes to audio updates from the main process
 * and exposes typed audio data per tab from the Zustand store.
 */
export function useTabAudio() {
  const audioData = useVeilStore(s => s.audioData)

  const getTabAudio = useCallback((tabId: string): AudioData | undefined => {
    return audioData.find(d => d.tabId === tabId)
  }, [audioData])

  return { audioData, getTabAudio }
}
