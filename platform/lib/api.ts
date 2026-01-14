import { getToken } from './token';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      data?.message?.toString?.() ||
      data?.error?.toString?.() ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export type User = { id: string; email: string; name: string };
export type Account = { id: string; currency: 'USD' | 'EUR'; balanceCents: string };
export type Transaction =
  | {
      id: string;
      type: 'transfer';
      createdAt: string;
      direction: 'in' | 'out';
      currency: 'USD' | 'EUR';
      amountCents: string;
      counterpartyEmail: string;
    }
  | {
      id: string;
      type: 'exchange';
      createdAt: string;
      srcCurrency: 'USD' | 'EUR';
      dstCurrency: 'USD' | 'EUR';
      srcAmountCents: string;
      dstAmountCents: string;
      rateNumerator: number;
      rateDenominator: number;
    };

export async function login(email: string, password: string) {
  return apiFetch<{ user: User; token: string }>(`/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, name: string, password: string) {
  return apiFetch<{ user: User; token: string }>(`/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, name, password }),
  });
}

export async function me() {
  return apiFetch<User | null>(`/auth/me`, { method: 'GET' });
}

export async function getAccounts() {
  return apiFetch<Account[]>(`/accounts`, { method: 'GET' });
}

export async function getTransactions(params: {
  type?: 'transfer' | 'exchange';
  page?: number;
  limit?: number;
}) {
  const usp = new URLSearchParams();
  if (params.type) usp.set('type', params.type);
  if (params.page) usp.set('page', String(params.page));
  if (params.limit) usp.set('limit', String(params.limit));
  const qs = usp.toString();
  return apiFetch<{ page: number; limit: number; items: Transaction[] }>(
    `/transactions${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  );
}

export type TransactionDetail = {
  id: string;
  type: 'transfer' | 'exchange';
  createdAt: string;
  fromUserId: string;
  toUserId: string;
  currency: 'USD' | 'EUR' | null;
  amountCents: string | null;
  srcCurrency: 'USD' | 'EUR' | null;
  dstCurrency: 'USD' | 'EUR' | null;
  srcAmountCents: string | null;
  dstAmountCents: string | null;
  rateNumerator: number | null;
  rateDenominator: number | null;
  ledgerEntries: Array<{
    id: string;
    accountId: string;
    currency: 'USD' | 'EUR';
    amountCents: string;
    createdAt: string;
  }>;
};

export async function getTransactionDetail(id: string) {
  return apiFetch<TransactionDetail>(`/transactions/${id}`, { method: 'GET' });
}

export async function transfer(params: {
  toEmail: string;
  currency: 'USD' | 'EUR';
  amount: string;
}) {
  return apiFetch<{ id: string }>(`/transactions/transfer`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function exchange(params: { fromCurrency: 'USD' | 'EUR'; amount: string }) {
  return apiFetch<{ id: string; dstAmountCents: string; rate: string }>(
    `/transactions/exchange`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
  );
}


