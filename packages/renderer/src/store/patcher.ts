import { useVeilStore } from './useVeilStore'

let isListenerRegistered = false

export function startStateListener() {
  if (window.veil && window.veil.onStatePatch) {
    const unsubscribe = window.veil.onStatePatch((patch) => {
      useVeilStore.getState().applyPatch(patch)
    })
    isListenerRegistered = true
    return unsubscribe
  } else {
    console.warn('Veil IPC state listener not available.')
    return () => {}
  }
}

export function isStateListenerRegistered(): boolean {
  return isListenerRegistered
}
