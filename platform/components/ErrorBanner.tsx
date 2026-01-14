'use client';

import { useEffect, useState } from 'react';

export function ErrorBanner({ message }: { message: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(Boolean(message));
  }, [message]);

  if (!message || !visible) return null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <div className="min-w-0 flex-1 break-words">{message}</div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setVisible(false)}
        className="shrink-0 rounded px-1 text-base leading-none opacity-80 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}


