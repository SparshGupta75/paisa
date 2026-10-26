import { describe, expect, it } from 'vitest';

import { formatCompact, formatINR, parseAmount } from './money';

describe('parseAmount', () => {
  it.each([
    ['40', 4000],
    ['₹40', 4000],
    ['rs 40', 4000],
    ['1,234.5', 123450],
    ['0.5', 50],
    ['2k', 200000],
    ['1.5L', 15000000],
    ['40rs', 4000],
    ['500/-', 50000],
  ])('%s → %d paise', (input, paise) => {
    expect(parseAmount(input)).toBe(paise);
  });

  it.each(['', 'abc', '0', '-5', '12.345', '1e5', 'chai'])('rejects %s', (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe('formatINR', () => {
  it('uses Indian grouping and drops .00', () => {
    expect(formatINR(123456789)).toBe('₹12,34,567.89');
    expect(formatINR(4000)).toBe('₹40');
    expect(formatINR(100000000)).toBe('₹10,00,000');
    expect(formatINR(5)).toBe('₹0.05');
  });

  it('compacts large numbers', () => {
    expect(formatCompact(95000)).toBe('₹950');
    expect(formatCompact(1250000)).toBe('₹12.5k');
    expect(formatCompact(12000000)).toBe('₹1.2L');
  });
});
