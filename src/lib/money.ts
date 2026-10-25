/**
 * Money utilities.
 *
 * Invariant: every monetary value in Paisa is stored and passed around as an
 * INTEGER number of paise (1 rupee = 100 paise). Floating point is never used
 * for storage or arithmetic. Parsing produces integers; formatting consumes
 * them. See docs/ARCHITECTURE.md#money.
 */

export const PAISE_PER_RUPEE = 100;

/** Guard rail: ~₹90 crore. Above this we almost certainly have a bug. */
export const MAX_AMOUNT_PAISE = 90_000_000_000;

/** Shown instead of a number when the input is not a finite amount. */
export const INVALID_AMOUNT = '—';

// Indian numbering inserts separators every two digits, counted from the end
// of the group that precedes the final three digits (12,34,56,789).
const INDIAN_GROUPING = /(\d)(?=(\d{2})+$)/g;

// Comma placement must be meaningful. Accepting "1,2,3" as 123 is how a typo
// becomes a wrong balance.
const INDIAN_COMMA_GROUPING = /^\d{1,2}(?:,\d{2})*,\d{3}(?:\.\d*)?$/;
const WESTERN_COMMA_GROUPING = /^\d{1,3}(?:,\d{3})+(?:\.\d*)?$/;

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

function groupIndian(digits: string): string {
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return rest ? `${rest.replace(INDIAN_GROUPING, '$1,')},${lastThree}` : lastThree;
}

/**
 * Parses user input into paise.
 *
 * Accepts "1234", "1,234.5", "₹ 1,234.50", "1,23,456", Devanagari digits.
 * Rounds half-up at the third decimal ("1.005" → 101 paise) using string
 * arithmetic, never `Math.round(value * 100)`, which is wrong for values like
 * 1.005 because 1.005 * 100 === 100.49999999999999 in IEEE 754.
 *
 * Returns `null` for anything that is not a finite, non-negative amount, so
 * callers can show a validation message instead of storing NaN.
 */
export function parseAmountToPaise(input: string): number | null {
  if (typeof input !== 'string') return null;

  // Normalise: drop whitespace and the currency symbol, convert Devanagari
  // digits, and leave commas in place until their grouping is validated.
  const normalised = input
    .replace(/[\s₹]/g, '')
    .replace(/[०-९]/g, (digit) => String(DEVANAGARI_DIGITS.indexOf(digit)));

  if (normalised === '') return null;

  if (normalised.includes(',')) {
    if (!INDIAN_COMMA_GROUPING.test(normalised) && !WESTERN_COMMA_GROUPING.test(normalised)) {
      return null;
    }
  }

  const cleaned = normalised.replace(/,/g, '');
  if (cleaned === '' || cleaned === '.') return null;
  if (!/^\d*(?:\.\d*)?$/.test(cleaned)) return null;

  const [wholePart = '', fractionPart = ''] = cleaned.split('.');

  const wholeDigits = (wholePart === '' ? '0' : wholePart).replace(/^0+(?=\d)/, '');
  // Beyond 12 integer digits we are past the ceiling; reject before Number().
  if (wholeDigits.length > 12) return null;

  // Three fractional digits: the first two are paise, the third only decides
  // whether to round up.
  const fraction = `${fractionPart}000`.slice(0, 3);
  const roundUp = fraction.charAt(2) >= '5' ? 1 : 0;

  const paise = Number(wholeDigits) * PAISE_PER_RUPEE + Number(fraction.slice(0, 2)) + roundUp;

  if (!Number.isSafeInteger(paise) || paise > MAX_AMOUNT_PAISE) return null;

  return paise;
}

export interface FormatOptions {
  /** Always render two decimal places. Defaults to showing them only when needed. */
  forceDecimals?: boolean;
  /** Prefix with ₹. Defaults to true. */
  currencySymbol?: boolean;
  /** Show a leading + for positive values (used in ledgers). */
  signed?: boolean;
}

/**
 * Formats paise as an Indian-grouped rupee string, e.g. `₹12,34,567.50`.
 * Deterministic (no Intl dependency) so it renders identically everywhere and
 * can be exhaustively unit tested.
 *
 * Non-finite input returns `INVALID_AMOUNT` rather than a plausible-looking
 * `₹0`: silently rendering a bug as zero is worse than showing a placeholder.
 */
export function formatINR(paise: number, options: FormatOptions = {}): string {
  if (typeof paise !== 'number' || !Number.isFinite(paise)) return INVALID_AMOUNT;

  const { forceDecimals = false, currencySymbol = true, signed = false } = options;

  const rounded = Math.round(paise);
  const negative = rounded < 0;
  const absolute = Math.abs(rounded);
  const rupees = Math.floor(absolute / PAISE_PER_RUPEE);
  const remainder = absolute % PAISE_PER_RUPEE;

  const showDecimals = forceDecimals || remainder !== 0;
  const body = showDecimals
    ? `${groupIndian(String(rupees))}.${String(remainder).padStart(2, '0')}`
    : groupIndian(String(rupees));

  const sign = negative ? '-' : signed && absolute > 0 ? '+' : '';
  return `${sign}${currencySymbol ? '₹' : ''}${body}`;
}

/** Compact form for chart axes and summary chips, e.g. ₹1.2L, ₹45.5k. */
export function formatINRCompact(paise: number): string {
  if (typeof paise !== 'number' || !Number.isFinite(paise)) return INVALID_AMOUNT;

  const negative = paise < 0;
  const rupees = Math.abs(paise) / PAISE_PER_RUPEE;
  const sign = negative ? '-' : '';

  if (rupees >= 1_00_00_000) return `${sign}₹${trim(rupees / 1_00_00_000)}Cr`;
  if (rupees >= 1_00_000) return `${sign}₹${trim(rupees / 1_00_000)}L`;
  if (rupees >= 1_000) return `${sign}₹${trim(rupees / 1_000)}k`;
  return `${sign}₹${trim(rupees)}`;
}

function trim(value: number): string {
  return Number(value.toFixed(1)).toString();
}
