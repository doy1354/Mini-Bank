'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '../../components/Nav';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Modal } from '../../components/Modal';
import * as api from '../../lib/api';
import { formatDateTime } from '../../lib/datetime';
import { getErrorMessage } from '../../lib/errors';
import { centsToDisplay } from '../../lib/money';
import { getToken } from '../../lib/token';

export default function TransactionsPage() {
  const router = useRouter();
  const [type, setType] = useState<'all' | 'transfer' | 'exchange'>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<api.Transaction[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<api.TransactionDetail | null>(null);

  const load = useCallback(async (p: number, t: typeof type) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getTransactions({
        page: p,
        limit,
        type: t === 'all' ? undefined : t,
      });
      setItems(res.items);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (!getToken()) router.push('/login');
    else load(page, type);
  }, [router, page, type, load]);

  async function openDetail(id: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const d = await api.getTransactionDetail(id);
      setDetail(d);
    } catch (e: unknown) {
      setDetail(null);
      setDetailError(getErrorMessage(e) || 'Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-zinc-900">Transactions</h1>
          <div className="flex items-center gap-2">
            <div className="text-sm text-zinc-700">Filter:</div>
            <select
              value={type}
              onChange={(e) => {
                setPage(1);
                setType(e.target.value as 'all' | 'transfer' | 'exchange');
              }}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="transfer">Transfer</option>
              <option value="exchange">Exchange</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>

        {loading ? (
          <div className="mt-6 text-sm text-zinc-600">Loading…</div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="grid grid-cols-12 gap-3 border-b border-zinc-200 px-4 py-3 text-xs font-semibold text-zinc-600">
              <div className="col-span-3">When</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-3">Details</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-zinc-600">No results.</div>
            ) : (
              items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openDetail(t.id)}
                  className="grid w-full grid-cols-12 gap-3 border-b border-zinc-100 px-4 py-3 text-left text-sm hover:bg-zinc-50"
                >
                  <div className="col-span-3 text-zinc-700">
                    {formatDateTime(t.createdAt)}
                  </div>
                  <div className="col-span-3 text-zinc-900">{t.type}</div>
                  <div className="col-span-3 text-zinc-700">
                    {t.type === 'transfer'
                      ? `${t.direction === 'out' ? 'to' : 'from'} ${t.counterpartyEmail}`
                      : `${t.srcCurrency} → ${t.dstCurrency}`}
                  </div>
                  <div className="col-span-3 text-right text-zinc-900">
                    {t.type === 'transfer'
                      ? centsToDisplay(t.amountCents, t.currency)
                      : `${centsToDisplay(t.srcAmountCents, t.srcCurrency)} → ${centsToDisplay(
                          t.dstAmountCents,
                          t.dstCurrency,
                        )}`}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:border-zinc-300 disabled:bg-white disabled:text-zinc-400 disabled:opacity-100"
          >
            Previous
          </button>
          <div className="text-sm text-zinc-700">Page {page}</div>
          <button
            disabled={items.length < limit}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:border-zinc-300 disabled:bg-white disabled:text-zinc-400 disabled:opacity-100"
          >
            Next
          </button>
        </div>
      </main>

      <Modal
        open={detailOpen}
        title="Transaction receipt"
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
          setDetailError(null);
        }}
      >
        {detailLoading ? (
          <div className="text-sm text-zinc-600">Loading…</div>
        ) : detailError ? (
          <ErrorBanner message={detailError} />
        ) : detail ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-zinc-600">ID</div>
              <div className="font-mono text-zinc-900">{detail.id}</div>
              <div className="text-zinc-600">Type</div>
              <div className="text-zinc-900">{detail.type}</div>
              <div className="text-zinc-600">When</div>
              <div className="text-zinc-900">{formatDateTime(detail.createdAt)}</div>
              {detail.type === 'transfer' ? (
                <>
                  <div className="text-zinc-600">Amount</div>
                  <div className="text-zinc-900">
                    {detail.currency && detail.amountCents
                      ? centsToDisplay(detail.amountCents, detail.currency)
                      : '-'}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-zinc-600">Exchange</div>
                  <div className="text-zinc-900">
                    {detail.srcCurrency &&
                    detail.dstCurrency &&
                    detail.srcAmountCents &&
                    detail.dstAmountCents
                      ? `${centsToDisplay(detail.srcAmountCents, detail.srcCurrency)} → ${centsToDisplay(
                          detail.dstAmountCents,
                          detail.dstCurrency,
                        )}`
                      : '-'}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="text-xs font-semibold text-zinc-700">Ledger entries</div>
              <div className="mt-2 space-y-1">
                {detail.ledgerEntries.map((le) => (
                  <div key={le.id} className="flex items-center justify-between gap-3">
                    <div className="font-mono text-xs text-zinc-700">{le.accountId}</div>
                    <div className="text-zinc-900">
                      {centsToDisplay(le.amountCents, le.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-600">No selection.</div>
        )}
      </Modal>
    </div>
  );
}


