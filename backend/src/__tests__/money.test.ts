import { parseMoneyToCents, roundDiv } from '../utils/money';
import { computeFixedExchange } from '../utils/exchange';

describe('money utils', () => {
  test('parseMoneyToCents parses whole amounts', () => {
    expect(parseMoneyToCents('0').toString()).toBe('0');
    expect(parseMoneyToCents('10').toString()).toBe('1000');
  });

  test('parseMoneyToCents parses decimals up to 2dp', () => {
    expect(parseMoneyToCents('10.0').toString()).toBe('1000');
    expect(parseMoneyToCents('10.00').toString()).toBe('1000');
    expect(parseMoneyToCents('10.01').toString()).toBe('1001');
    expect(parseMoneyToCents('10.10').toString()).toBe('1010');
  });

  test('parseMoneyToCents rejects invalid formats', () => {
    expect(() => parseMoneyToCents('')).toThrow();
    expect(() => parseMoneyToCents('10.001')).toThrow();
    expect(() => parseMoneyToCents('-1.00')).toThrow();
    expect(() => parseMoneyToCents('abc')).toThrow();
  });

  test('roundDiv is half-up for positive integers', () => {
    expect(roundDiv(1n, 2n).toString()).toBe('1');
    expect(roundDiv(3n, 2n).toString()).toBe('2');
    expect(roundDiv(4n, 2n).toString()).toBe('2');
  });
});

describe('fixed exchange', () => {
  test('EUR -> USD uses 1 EUR = 1/0.92 USD (rounded)', () => {
    const res = computeFixedExchange({ fromCurrency: 'EUR', fromAmountCents: 1000n });
    expect(res.toCurrency).toBe('USD');
    expect(res.toAmountCents.toString()).toBe('1087');
  });

  test('USD -> EUR uses 1 USD = 0.92 EUR (rounded)', () => {
    const res = computeFixedExchange({ fromCurrency: 'USD', fromAmountCents: 1000n });
    expect(res.toCurrency).toBe('EUR');
    expect(res.toAmountCents.toString()).toBe('920');
  });
});


