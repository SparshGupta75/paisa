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

// Indian numbering inserts separators every two digits, counted from the end
// of the group that precedes the final three digits (12,34,56,789).
const INDIAN_GROUPING = /(\d)(?=(\d{2})+$)/g;

function groupIndian(digits: string): string {
  // Indian numbering: last three digits, then groups of two (12,34,56,789).
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return rest ? `${rest.replace(INDIAN_GROUPING, '$1,')},${lastThree}` : lastThree;
}

/**
 * Parses user input into paise.
 *
 * Accepts "1234", "1,234.5", "₹ 1,234.50", "1234.567" (rounded to 2dp).
 * Returns `null` for anything that is not a finite, non-negative amount, so
 * callers can show a validation message instead of storing NaN.
 */
export function parseAmountToPaise(input: string): number | null {
  if (typeof input !== 'string') return null;

  const cleaned = input
    .replace(/[\s,₹]/g, '')
    .replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)));

  if (cleaned === '' || !/^\d*(\.\d*)?$/.test(cleaned)) return null;
  if (cleaned === '.') return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;

  const paise = Math.round(value * PAISE_PER_RUPEE);
  if (paise > MAX_AMOUNT_PAISE) return null;

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
 */
export function formatINR(paise: number, options: FormatOptions = {}): string {
  const { forceDecimals = false, currencySymbol = true, signed = false } = options;

  if (!Number.isFinite(paise)) return currencySymbol ? '₹0' : '0';

  const negative = paise < 0;
  const absolute = Math.abs(Math.round(paise));
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
  if (!Number.isFinite(paise)) return '₹0';

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
