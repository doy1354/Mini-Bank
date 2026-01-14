import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
  durationMs: number;
};

type ToastState = {
  toasts: Toast[];
  push: (t: { type: ToastType; message: string; durationMs?: number }) => string;
  remove: (id: string) => void;
  clear: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const toast: Toast = {
      id,
      type: t.type,
      message: t.message,
      createdAt: Date.now(),
      durationMs: t.durationMs ?? 3500,
    };
    set((s) => ({ toasts: [toast, ...s.toasts].slice(0, 4) }));
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  clear: () => set({ toasts: [] }),
}));


