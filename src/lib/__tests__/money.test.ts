import { formatINR, formatINRCompact, parseAmountToPaise } from '../money';

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
  });

  it('rounds sub-paise precision instead of truncating', () => {
    expect(parseAmountToPaise('1234.567')).toBe(123457);
    expect(parseAmountToPaise('0.005')).toBe(1);
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

  it('rejects amounts above the sanity ceiling', () => {
    expect(parseAmountToPaise('900000001')).toBeNull();
    expect(parseAmountToPaise('900000000')).toBe(90_000_000_000);
  });

  it('is not fooled by non-string input at runtime', () => {
    // Guards against values arriving from a text input proxy or JSON.
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

  it('can force decimals or a signed prefix', () => {
    expect(formatINR(1234000, { forceDecimals: true })).toBe('₹12,340.00');
    expect(formatINR(50000, { signed: true })).toBe('+₹500');
    expect(formatINR(0, { signed: true })).toBe('₹0');
  });

  it('can omit the currency symbol', () => {
    expect(formatINR(123450, { currencySymbol: false })).toBe('1,234.50');
  });

  it('degrades safely on non-finite input', () => {
    expect(formatINR(NaN)).toBe('₹0');
    expect(formatINR(Infinity)).toBe('₹0');
  });
});

describe('formatINRCompact', () => {
  it('scales to thousands, lakhs and crores', () => {
    expect(formatINRCompact(1234000)).toBe('₹12.3k');
    expect(formatINRCompact(123400000)).toBe('₹12.3L');
    expect(formatINRCompact(1234000000)).toBe('₹1.2Cr');
    expect(formatINRCompact(50000)).toBe('₹500');
  });

  it('keeps the sign', () => {
    expect(formatINRCompact(-1234000)).toBe('-₹12.3k');
  });
});
