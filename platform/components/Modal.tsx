'use client';

import { ReactNode, useEffect } from 'react';

export function Modal(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const open = props.open;
  const onClose = props.onClose;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={props.onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative mx-4 w-full max-w-lg rounded-lg border border-zinc-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div className="text-sm font-semibold text-zinc-900">{props.title}</div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded px-2 py-1 text-sm text-zinc-600 hover:text-zinc-900"
          >
            ×
          </button>
        </div>
        <div className="px-4 py-3">{props.children}</div>
      </div>
    </div>
  );
}


