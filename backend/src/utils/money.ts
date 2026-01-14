export type Currency = 'USD' | 'EUR';

export function parseMoneyToCents(input: string): bigint {
  const s = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) {
    throw new Error('Invalid amount format');
  }
  const [whole, frac = ''] = s.split('.');
  const fracPadded = (frac + '00').slice(0, 2);
  return BigInt(whole) * 100n + BigInt(fracPadded);
}

export function formatCents(cents: bigint, currency: Currency): string {
  const sign = cents < 0n ? '-' : '';
  const abs = cents < 0n ? -cents : cents;
  const whole = abs / 100n;
  const frac = abs % 100n;
  const fracStr = frac.toString().padStart(2, '0');
  return `${sign}${currency} ${whole.toString()}.${fracStr}`;
}

export function roundDiv(numer: bigint, denom: bigint): bigint {
  return (numer + denom / 2n) / denom;
}


