import type { VeilAction } from '@veil/shared/actions'
import type { VeilState, AudioData, SearchResult } from '@veil/shared/state'

declare global {
  interface Window {
    veil: {
      dispatch: (action: VeilAction) => Promise<unknown>
      onStatePatch:    (cb: (patch: Partial<VeilState>) => void) => () => void
      onAudioUpdate:   (cb: (data: AudioData[]) => void)         => () => void
      onSearchResults: (cb: (results: SearchResult[]) => void)   => () => void
      onPrivacyStats:  (cb: (stats: { totalBlocked: number; perTab: Record<string, number> }) => void) => () => void
    }
  }
}

export {}
