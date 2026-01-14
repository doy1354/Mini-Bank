import { Currency, roundDiv } from './money';

export function computeFixedExchange(params: {
  fromCurrency: Currency;
  fromAmountCents: bigint;
}) {
  const { fromCurrency, fromAmountCents } = params;
  const toCurrency: Currency = fromCurrency === 'USD' ? 'EUR' : 'USD';
  const rateNumer = fromCurrency === 'USD' ? 92n : 100n;
  const rateDenom = fromCurrency === 'USD' ? 100n : 92n;
  const toAmountCents = roundDiv(fromAmountCents * rateNumer, rateDenom);
  return {
    toCurrency,
    toAmountCents,
    rateNumer,
    rateDenom,
  };
}


