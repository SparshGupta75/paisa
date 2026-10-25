import { INVALID_AMOUNT, formatINR, formatINRCompact, parseAmountToPaise } from '../money';

describe('parseAmountToPaise', () => {
  it('parses plain rupee input into paise', () => {
    expect(parseAmountToPaise('1234')).toBe(123400);
    expect(parseAmountToPaise('0')).toBe(0);
  });

  it('accepts the formats people actually type', () => {
    expect(parseAmountToPaise('1,234.5')).toBe(123450);
    expect(parseAmountToPaise('₹ 1,234.50')).toBe(123450);
    expect(parseAmountToPaise(' 42 ')).toBe(4200);
    expect(parseAmountToPaise('.5')).toBe(50);
    expect(parseAmountToPaise('99.')).toBe(9900);
    expect(parseAmountToPaise('1,23,456')).toBe(12345600);
    expect(parseAmountToPaise('12,345,678')).toBe(1234567800);
  });

  it('rounds half-up on the third decimal without float error', () => {
    // Regression: Math.round(1.005 * 100) === 100, not 101.
    expect(parseAmountToPaise('1.005')).toBe(101);
    expect(parseAmountToPaise('1.015')).toBe(102);
    expect(parseAmountToPaise('2.675')).toBe(268);
    expect(parseAmountToPaise('0.004')).toBe(0);
    expect(parseAmountToPaise('0.005')).toBe(1);
    expect(parseAmountToPaise('1234.567')).toBe(123457);
  });

  it('handles Devanagari digits', () => {
    expect(parseAmountToPaise('१२३')).toBe(12300);
    expect(parseAmountToPaise('५०.५०')).toBe(5050);
  });

  it('rejects input that is not a non-negative amount', () => {
    expect(parseAmountToPaise('')).toBeNull();
    expect(parseAmountToPaise('   ')).toBeNull();
    expect(parseAmountToPaise('.')).toBeNull();
    expect(parseAmountToPaise('abc')).toBeNull();
    expect(parseAmountToPaise('12.3.4')).toBeNull();
    expect(parseAmountToPaise('-5')).toBeNull();
    expect(parseAmountToPaise('1e5')).toBeNull();
    expect(parseAmountToPaise('12-3')).toBeNull();
  });

  it('rejects commas that do not follow a valid grouping', () => {
    // "1,2,3" must not silently become 123.
    expect(parseAmountToPaise('1,2,3')).toBeNull();
    expect(parseAmountToPaise('1234,567')).toBeNull();
    expect(parseAmountToPaise(',123')).toBeNull();
    expect(parseAmountToPaise('123,')).toBeNull();
  });

  it('rejects amounts above the sanity ceiling', () => {
    expect(parseAmountToPaise('900000001')).toBeNull();
    expect(parseAmountToPaise('900000000')).toBe(90_000_000_000);
    expect(parseAmountToPaise('999999999999999')).toBeNull();
  });

  it('is not fooled by non-string input at runtime', () => {
    expect(parseAmountToPaise(undefined as unknown as string)).toBeNull();
    expect(parseAmountToPaise(1234 as unknown as string)).toBeNull();
  });
});

describe('formatINR', () => {
  it('omits decimals for whole rupees', () => {
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(1234000)).toBe('₹12,340');
  });

  it('shows paise when present', () => {
    expect(formatINR(123450)).toBe('₹1,234.50');
    expect(formatINR(5)).toBe('₹0.05');
  });

  it('uses Indian digit grouping', () => {
    expect(formatINR(10000000)).toBe('₹1,00,000');
    expect(formatINR(12345678900)).toBe('₹12,34,56,789');
  });

  it('renders negatives with a leading minus', () => {
    expect(formatINR(-50000)).toBe('-₹500');
    expect(formatINR(-123450)).toBe('-₹1,234.50');
  });

  it('never renders a negative zero', () => {
    expect(formatINR(-0)).toBe('₹0');
    expect(formatINR(-0.4)).toBe('₹0');
  });

  it('can force decimals or a signed prefix', () => {
    expect(formatINR(1234000, { forceDecimals: true })).toBe('₹12,340.00');
    expect(formatINR(50000, { signed: true })).toBe('+₹500');
    expect(formatINR(0, { signed: true })).toBe('₹0');
  });

  it('can omit the currency symbol', () => {
    expect(formatINR(123450, { currencySymbol: false })).toBe('1,234.50');
  });

  it('shows a placeholder for non-finite input instead of a fake zero', () => {
    expect(formatINR(NaN)).toBe(INVALID_AMOUNT);
    expect(formatINR(Infinity)).toBe(INVALID_AMOUNT);
    expect(formatINR(-Infinity)).toBe(INVALID_AMOUNT);
  });
});

describe('formatINRCompact', () => {
  it('scales to thousands, lakhs and crores', () => {
    expect(formatINRCompact(1234000)).toBe('₹12.3k');
    expect(formatINRCompact(123400000)).toBe('₹12.3L');
    expect(formatINRCompact(1234000000)).toBe('₹1.2Cr');
    expect(formatINRCompact(0)).toBe('₹0');
    expect(formatINRCompact(50000)).toBe('₹500');
  });

  it('keeps the sign', () => {
    expect(formatINRCompact(-1234000)).toBe('-₹12.3k');
  });

  it('shows a placeholder for non-finite input', () => {
    expect(formatINRCompact(NaN)).toBe(INVALID_AMOUNT);
  });
});
