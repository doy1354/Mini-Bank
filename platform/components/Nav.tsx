'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/auth';

export function Nav() {
  const router = useRouter();
  const { token, user, initFromStorage, fetchMe, logout } = useAuthStore();

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    if (token && !user) {
      fetchMe();
    }
  }, [token, user, fetchMe]);

  function onLogout() {
    logout();
    router.push('/login');
  }

  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <a href="/dashboard" className="text-sm font-semibold text-zinc-900">
          Mini Bank
        </a>
        <div className="flex items-center gap-4 text-sm">
          <a href="/dashboard" className="text-zinc-700 hover:text-zinc-900">
            Dashboard
          </a>
          <a href="/transactions" className="text-zinc-700 hover:text-zinc-900">
            Transactions
          </a>
          {token && user ? (
            <div className="hidden text-zinc-600 sm:block">{user.name}</div>
          ) : null}
          {token ? (
            <button
              type="button"
              onClick={onLogout}
              className="text-zinc-700 hover:text-zinc-900"
            >
              Logout
            </button>
          ) : (
            <a href="/login" className="text-zinc-700 hover:text-zinc-900">
              Login
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}


