'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '../../components/Nav';
import { ErrorBanner } from '../../components/ErrorBanner';
import * as api from '../../lib/api';
import { formatDateTime } from '../../lib/datetime';
import { getErrorMessage } from '../../lib/errors';
import { centsToDisplay, computeExchange } from '../../lib/money';
import { getToken } from '../../lib/token';
import { useToastStore } from '../../stores/toast';
import { getSocket } from '../../lib/realtime';

export default function DashboardPage() {
  const router = useRouter();
  const pushToast = useToastStore((s) => s.push);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<api.Account[]>([]);
  const [recent, setRecent] = useState<api.Transaction[]>([]);
  const wsBound = useRef(false);

  const [transferTo, setTransferTo] = useState('hassan@test.com');
  const [transferCurrency, setTransferCurrency] = useState<'USD' | 'EUR'>('USD');
  const [transferAmount, setTransferAmount] = useState('10.00');
  const [isTransferring, setIsTransferring] = useState(false);

  const [exchangeFrom, setExchangeFrom] = useState<'USD' | 'EUR'>('USD');
  const [exchangeAmount, setExchangeAmount] = useState('10.00');
  const [isExchanging, setIsExchanging] = useState(false);

  const isValidMoney = (v: string) =>
    /^\d+(\.\d{1,2})?$/.test(v.trim()) &&
    v.trim() !== '0' &&
    v.trim() !== '0.0' &&
    v.trim() !== '0.00';
  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const isTransferValid = isValidEmail(transferTo) && isValidMoney(transferAmount);
  const isExchangeValid = isValidMoney(exchangeAmount);

  const exchangePreview = useMemo(() => {
    const ok = /^\d+(\.\d{1,2})?$/.test(exchangeAmount.trim());
    if (!ok) return null;
    const [w, f = ''] = exchangeAmount.trim().split('.');
    const cents = BigInt(w) * 100n + BigInt((f + '00').slice(0, 2));
    return computeExchange(exchangeFrom, cents);
  }, [exchangeAmount, exchangeFrom]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, t] = await Promise.all([
        api.getAccounts(),
        api.getTransactions({ page: 1, limit: 5 }),
      ]);
      setAccounts(a);
      setRecent(t.items);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) router.push('/login');
    else load();
  }, [router, load]);

  useEffect(() => {
    if (wsBound.current) return;
    if (!getToken()) return;
    const s = getSocket();
    wsBound.current = true;
    const handler = () => {
      load();
    };
    s.on('balances.updated', handler);
    return () => {
      s.off('balances.updated', handler);
      wsBound.current = false;
    };
  }, [load]);

  async function onTransfer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isTransferValid) {
      const msg = 'Please enter a valid recipient email and amount.';
      setError(msg);
      pushToast({ type: 'error', message: msg });
      return;
    }

    const confirmed = window.confirm(
      `Confirm transfer:\n\nTo: ${transferTo.trim()}\nAmount: ${transferCurrency} ${transferAmount.trim()}`,
    );
    if (!confirmed) return;

    setIsTransferring(true);
    try {
      await api.transfer({
        toEmail: transferTo,
        currency: transferCurrency,
        amount: transferAmount,
      });
      pushToast({ type: 'success', message: 'Transfer completed.' });
      await load();
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || 'Transfer failed';
      setError(msg);
      pushToast({ type: 'error', message: msg });
    } finally {
      setIsTransferring(false);
    }
  }

  async function onExchange(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isExchangeValid) {
      const msg = 'Please enter a valid amount.';
      setError(msg);
      pushToast({ type: 'error', message: msg });
      return;
    }

    const previewText = exchangePreview
      ? `\nExpected: ${exchangePreview.toCurrency} ${(exchangePreview.toAmountCents / 100n).toString()}.${(exchangePreview.toAmountCents % 100n).toString().padStart(2, '0')}`
      : '';

    const confirmed = window.confirm(
      `Confirm exchange:\n\nFrom: ${exchangeFrom}\nAmount: ${exchangeAmount.trim()}${previewText}\nRate: 1 USD = 0.92 EUR`,
    );
    if (!confirmed) return;

    setIsExchanging(true);
    try {
      await api.exchange({ fromCurrency: exchangeFrom, amount: exchangeAmount });
      pushToast({ type: 'success', message: 'Exchange completed.' });
      await load();
    } catch (e: unknown) {
      const msg = getErrorMessage(e) || 'Exchange failed';
      setError(msg);
      pushToast({ type: 'error', message: msg });
    } finally {
      setIsExchanging(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <a
            href="/transactions"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            View all transactions →
          </a>
        </div>

        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>

        {loading ? (
          <div className="mt-6 text-sm text-zinc-600">Loading…</div>
        ) : (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-zinc-900">Balances</h2>
                <div className="mt-3 space-y-2">
                  {accounts.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-md border border-zinc-100 px-3 py-2"
                    >
                      <div className="text-sm font-medium text-zinc-900">
                        {a.currency}
                      </div>
                      <div className="text-sm text-zinc-700">
                        {centsToDisplay(a.balanceCents, a.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-zinc-900">
                  Last 5 transactions
                </h2>
                <div className="mt-3 space-y-2">
                  {recent.length === 0 ? (
                    <div className="text-sm text-zinc-600">No transactions yet.</div>
                  ) : (
                    recent.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-md border border-zinc-100 px-3 py-2 text-sm"
                      >
                        {t.type === 'transfer' ? (
                          <div className="flex items-center justify-between">
                            <div className="text-zinc-900">
                              Transfer {t.direction === 'out' ? 'to' : 'from'}{' '}
                              {t.counterpartyEmail}
                            </div>
                            <div className="text-zinc-700">
                              {centsToDisplay(t.amountCents, t.currency)}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="text-zinc-900">Exchange</div>
                            <div className="text-zinc-700">
                              {centsToDisplay(t.srcAmountCents, t.srcCurrency)} →{' '}
                              {centsToDisplay(t.dstAmountCents, t.dstCurrency)}
                            </div>
                          </div>
                        )}
                        <div className="mt-1 text-xs text-zinc-500">
                          {formatDateTime(t.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-zinc-900">Transfer</h2>
                <form onSubmit={onTransfer} className="mt-3 space-y-3">
                  <label className="block">
                    <div className="text-sm font-medium text-zinc-900">Recipient</div>
                    <input
                      disabled={isTransferring}
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <div className="text-sm font-medium text-zinc-900">Currency</div>
                      <select
                        disabled={isTransferring}
                        value={transferCurrency}
                        onChange={(e) =>
                          setTransferCurrency(e.target.value as 'USD' | 'EUR')
                        }
                        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </label>
                    <label className="block">
                      <div className="text-sm font-medium text-zinc-900">Amount</div>
                      <input
                        disabled={isTransferring}
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                        placeholder="10.00"
                      />
                    </label>
                  </div>

                  <button
                    disabled={isTransferring || !isTransferValid}
                    className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isTransferring ? 'Submitting…' : 'Submit transfer'}
                  </button>
                </form>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-zinc-900">Exchange</h2>
                <p className="mt-1 text-xs text-zinc-600">Fixed rate: 1 USD = 0.92 EUR</p>
                <form onSubmit={onExchange} className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <div className="text-sm font-medium text-zinc-900">
                        Source currency
                      </div>
                      <select
                        disabled={isExchanging}
                        value={exchangeFrom}
                        onChange={(e) => setExchangeFrom(e.target.value as 'USD' | 'EUR')}
                        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </label>
                    <label className="block">
                      <div className="text-sm font-medium text-zinc-900">Amount</div>
                      <input
                        disabled={isExchanging}
                        value={exchangeAmount}
                        onChange={(e) => setExchangeAmount(e.target.value)}
                        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
                        placeholder="10.00"
                      />
                    </label>
                  </div>

                  <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    {exchangePreview ? (
                      <>
                        Converted amount:{' '}
                        <span className="font-medium text-zinc-900">
                          {exchangePreview.toCurrency}{' '}
                          {(exchangePreview.toAmountCents / 100n).toString()}.
                          {(exchangePreview.toAmountCents % 100n)
                            .toString()
                            .padStart(2, '0')}
                        </span>
                        <div className="text-xs text-zinc-600">{exchangePreview.rateText}</div>
                      </>
                    ) : (
                      <span className="text-zinc-600">Enter a valid amount.</span>
                    )}
                  </div>

                  <button
                    disabled={isExchanging || !isExchangeValid}
                    className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {isExchanging ? 'Submitting…' : 'Submit exchange'}
                  </button>
                </form>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}


