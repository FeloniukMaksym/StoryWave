import { create } from 'zustand';

type Severity = 'error' | 'warning' | 'info' | 'success';

interface ToastState {
  message: string;
  severity: Severity;
  open: boolean;
  show: (message: string, severity?: Severity) => void;
  close: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  severity: 'error',
  open: false,
  show: (message, severity = 'error') => set({ message, severity, open: true }),
  close: () => set({ open: false }),
}));

export const toast = {
  error: (msg: string) => useToastStore.getState().show(msg, 'error'),
  success: (msg: string) => useToastStore.getState().show(msg, 'success'),
  info: (msg: string) => useToastStore.getState().show(msg, 'info'),
};
