'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '../../components/Nav';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAuthStore } from '../../stores/auth';

export default function LoginPage() {
  const router = useRouter();
  const { token, user, loading, error, initFromStorage, login, register } =
    useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    if (token && user) router.push('/dashboard');
  }, [token, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'login') {
      await login(email, password);
    } else {
      await register(email, name, password);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Nav />
      <main className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-xl font-semibold text-zinc-900">
          {mode === 'login' ? 'Login' : 'Register'}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Use the seeded users: maria/hassan/lina with password <code>Password123!</code>
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-md px-3 py-1.5 text-sm ${
              mode === 'login'
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-300 bg-white text-zinc-900'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-md px-3 py-1.5 text-sm ${
              mode === 'register'
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-300 bg-white text-zinc-900'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <ErrorBanner message={error} />

          <label className="block">
            <div className="text-sm font-medium text-zinc-900">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              placeholder="you@test.com"
            />
          </label>

          {mode === 'register' ? (
            <label className="block">
              <div className="text-sm font-medium text-zinc-900">Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                placeholder="Your name"
              />
            </label>
          ) : null}

          <label className="block">
            <div className="text-sm font-medium text-zinc-900">Password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              placeholder="Your password"
            />
          </label>

          <button
            disabled={loading}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading
              ? mode === 'login'
                ? 'Logging in…'
                : 'Signing up…'
              : mode === 'login'
                ? 'Login'
                : 'Create account'}
          </button>
        </form>
      </main>
    </div>
  );
}


