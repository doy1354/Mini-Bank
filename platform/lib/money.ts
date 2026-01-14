export type Currency = 'USD' | 'EUR';

export function centsToDisplay(cents: string, currency: Currency) {
  const v = BigInt(cents);
  const whole = v / 100n;
  const frac = v % 100n;
  return `${currency} ${whole.toString()}.${frac.toString().padStart(2, '0')}`;
}

export function roundDiv(numer: bigint, denom: bigint) {
  return (numer + denom / 2n) / denom;
}

export function computeExchange(
  fromCurrency: Currency,
  amountCents: bigint,
): { toCurrency: Currency; toAmountCents: bigint; rateText: string } {
  const toCurrency: Currency = fromCurrency === 'USD' ? 'EUR' : 'USD';
  const rateNumer = fromCurrency === 'USD' ? 92n : 100n;
  const rateDenom = fromCurrency === 'USD' ? 100n : 92n;
  const toAmountCents = roundDiv(amountCents * rateNumer, rateDenom);
  return {
    toCurrency,
    toAmountCents,
    rateText: `1 USD = 0.92 EUR`,
  };
}


