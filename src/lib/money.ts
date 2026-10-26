/** Money is always an integer number of paise (₹1 = 100). */

/** "1,234.50", "₹40", "2k", "1.5L" → paise. Null when it isn't a positive amount. */
export function parseAmount(input: string): number | null {
  const match = /^\+?(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?|\.\d{1,2})\s*(k|l|lakh)?\s*(?:rs\.?|₹|\/-)?$/i.exec(input.trim());
  if (!match) return null;
  const [, number = '', suffix] = match;
  const [whole = '0', fraction = ''] = number.replace(/,/g, '').split('.');
  let paise = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
  if (suffix) paise *= suffix.toLowerCase() === 'k' ? 1_000 : 1_00_000;
  if (!Number.isSafeInteger(paise) || paise <= 0 || paise > 1_00_00_00_000_00) return null;
  return paise;
}

/** 123456789 paise → "₹12,34,567.89"; whole rupees drop the decimals. */
export function formatINR(paise: number): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(Math.round(paise));
  const rupees = String(Math.floor(abs / 100));
  const rest = abs % 100;
  const lastThree = rupees.slice(-3);
  const head = rupees.slice(0, -3).replace(/\B(?=(\d{2})+$)/g, ',');
  const grouped = head ? `${head},${lastThree}` : lastThree;
  return `${sign}₹${grouped}${rest ? `.${String(rest).padStart(2, '0')}` : ''}`;
}

/** Compact form for tight spaces: ₹950, ₹12.5k, ₹1.2L, ₹3.4Cr. */
export function formatCompact(paise: number): string {
  const rupees = paise / 100;
  const trim = (n: number) => String(Number(n.toFixed(1)));
  if (rupees >= 1_00_00_000) return `₹${trim(rupees / 1_00_00_000)}Cr`;
  if (rupees >= 1_00_000) return `₹${trim(rupees / 1_00_000)}L`;
  if (rupees >= 10_000) return `₹${trim(rupees / 1_000)}k`;
  return formatINR(Math.round(rupees) * 100);
}
