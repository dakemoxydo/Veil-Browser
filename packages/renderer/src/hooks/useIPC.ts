import { useCallback } from 'react'
import type { VeilAction } from '@veil/shared/actions'

export function useIPC() {
  const dispatch = useCallback(async (action: VeilAction): Promise<unknown> => {
    if (window.veil && window.veil.dispatch) {
      try {
        return await window.veil.dispatch(action)
      } catch (error) {
        console.error(`[useIPC] Dispatch failed for action ${action.type}:`, error)
        throw error
      }
    } else {
      console.warn('[useIPC] IPC dispatch not available:', action)
      return Promise.reject(new Error('IPC dispatch not available'))
    }
  }, [])

  return { dispatch }
}
