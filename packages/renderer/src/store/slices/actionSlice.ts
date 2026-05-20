import { StateCreator } from 'zustand';
import { VeilAction } from '@veil/shared';

export interface ActionSlice {
  dispatch: (action: VeilAction) => void;
}

export const createActionSlice: StateCreator<ActionSlice> = (set, get) => ({
  dispatch: (action) => {
    // Access addLog from the full store via get()
    const store = get() as { addLog?: (level: string, source: string, message: string, data?: unknown) => void };
    if (store.addLog) {
      store.addLog('ACTION', 'Store', `Action: ${action.type}`, 'payload' in action ? action.payload : undefined);
    }
    if (window.veil) {
      window.veil.dispatch(action).catch((err) => {
        console.error(`[VeilStore] dispatch failed for ${action.type}:`, err);
      });
    }
  },
});
