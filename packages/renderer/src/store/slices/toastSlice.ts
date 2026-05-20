import { StateCreator } from 'zustand';
import { ToastItem } from '@veil/shared';

export interface ToastSlice {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;
}

const AUTO_DISMISS_MS = 3000;

export const createToastSlice: StateCreator<ToastSlice> = (set) => ({
  toasts: [],

  addToast: (message, type = 'info') => {
    const id = crypto.randomUUID();
    const toast: ToastItem = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };
    set((state) => ({
      toasts: [...state.toasts, toast],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, AUTO_DISMISS_MS);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
});
