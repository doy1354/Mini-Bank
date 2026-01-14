'use client';

import { useEffect, useRef } from 'react';
import { useToastStore } from '../stores/toast';

function toastStyle(type: 'success' | 'error' | 'info') {
  if (type === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (type === 'error') return 'border-red-200 bg-red-50 text-red-800';
  return 'border-zinc-200 bg-white text-zinc-800';
}

export function ToastHost() {
  const { toasts, remove } = useToastStore();
  const timers = useRef<Record<string, number>>({});

  useEffect(() => {
    for (const t of toasts) {
      if (timers.current[t.id]) continue;
      timers.current[t.id] = window.setTimeout(() => {
        remove(t.id);
        delete timers.current[t.id];
      }, t.durationMs);
    }
    return () => {
      for (const id of Object.keys(timers.current)) {
        window.clearTimeout(timers.current[id]);
      }
      timers.current = {};
    };
  }, [toasts, remove]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm shadow-sm ${toastStyle(
            t.type,
          )}`}
        >
          <div className="min-w-0 flex-1 break-words">{t.message}</div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => remove(t.id)}
            className="shrink-0 rounded px-1 text-base leading-none opacity-80 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}


