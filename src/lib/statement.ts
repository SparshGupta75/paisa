import { toISODate } from './dates';

export interface ColumnMap {
  date: number;
  description: number;
  /** Separate withdrawal/debit column, or -1. */
  debit: number;
  /** Separate deposit/credit column, or -1. */
  credit: number;
  /** Single signed or Dr/Cr amount column, or -1 (used when there is no debit column). */
  amount: number;
  /** A "Dr/Cr" type column next to `amount`, or -1. */
  type: number;
}

// Date columns in order of preference: when a bank gives both, the transaction
// date is when you spent; the value date is when the bank settled it.
const DATE_HEADERS = [/^(txn|transaction|tran|trans)\.? ?date$/i, /^date$/i, /^(posting|posted|book|booking) date$/i, /^value (date|dt)$/i];

const HEADER = {
  description: /narration|description|particulars|remarks|details|transaction details/i,
  debit: /withdrawal|debit|dr\.?$|paid out|money out/i,
  credit: /deposit|credit|cr\.?$|paid in|money in/i,
  amount: /^amount|amount \(|^amt|txn amount|transaction amount/i,
  type: /^(dr ?\/ ?cr|cr ?\/ ?dr|type|debit\/credit)$/i,
};

/** Finds the header row (bank exports often start with account details) and guesses the columns. */
export function detectColumns(rows: string[][]): { headerRow: number; map: ColumnMap } | null {
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const cells = rows[r]!.map((c) => c.toLowerCase().replace(/\s+/g, ' ').trim());
    const find = (re: RegExp, skip: number[] = []) => cells.findIndex((c, i) => !skip.includes(i) && re.test(c));
    const date = DATE_HEADERS.map((re) => find(re)).find((i) => i >= 0) ?? -1;
    const description = find(HEADER.description);
    if (date < 0 || description < 0) continue;
    const debit = find(HEADER.debit, [description]);
    const credit = find(HEADER.credit, [description, debit]);
    const amount = debit < 0 ? find(HEADER.amount) : -1;
    const type = amount >= 0 ? find(HEADER.type) : -1;
    if (debit < 0 && amount < 0) continue;
    return { headerRow: r, map: { date, description, debit, credit, amount, type } };
  }
  return null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Statement dates: dd/mm/yyyy, dd-mm-yy, dd-Mon-yyyy, dd Mon yyyy, yyyy-mm-dd (Indian banks are day-first). */
export function parseStatementDate(text: string): string | null {
  const s = text.trim().split(/[ T]\d{1,2}:\d{2}/)[0]!.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/.exec(s))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{1,2})[\s\-/]([a-z]{3})[a-z]*[\s\-/,]+(\d{2}|\d{4})$/i.exec(s))) {
    d = Number(match[1]);
    m = MONTHS.indexOf(match[2]!.toLowerCase()) + 1;
    y = Number(match[3]);
  } else return null;
  if (y < 100) y += 2000;
  const date = new Date(y, m - 1, d);
  if (m < 1 || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return toISODate(date);
}

/** "1,234.50", "₹ 1,234.50 Dr", "(500.00)", "-500" → absolute paise and an optional direction. */
export function parseStatementAmount(text: string): { paise: number; direction: 'debit' | 'credit' | null } | null {
  const s = text.replace(/[₹,\s]|INR|Rs\.?/gi, '');
  if (!s || s === '-') return null;
  const match = /^(\(?)(-?)(\d+(?:\.\d{1,2})?)\)?(dr|cr)?$/i.exec(s);
  if (!match) return null;
  const [, paren, minus, number = '0', suffix] = match;
  const [whole = '0', fraction = ''] = number.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (paise === 0) return null;
  const direction = suffix ? (suffix.toLowerCase() === 'dr' ? 'debit' : 'credit') : paren || minus ? 'debit' : null;
  return { paise, direction };
}

export interface StatementExpense {
  date: string;
  amount: number;
  raw: string;
}

/** Expenses (money out) from statement rows. Credits, blanks and unreadable rows are skipped. */
export function extractExpenses(rows: string[][], headerRow: number, map: ColumnMap): StatementExpense[] {
  const expenses: StatementExpense[] = [];
  // headerRow is -1 for files without a header row.
  for (const row of rows.slice(headerRow + 1)) {
    const date = parseStatementDate(row[map.date] ?? '');
    if (!date) continue;
    const raw = (row[map.description] ?? '').replace(/\s+/g, ' ').trim();
    let amount: number | null = null;
    if (map.debit >= 0) {
      amount = parseStatementAmount(row[map.debit] ?? '')?.paise ?? null;
    } else if (map.amount >= 0) {
      const parsed = parseStatementAmount(row[map.amount] ?? '');
      const type = (row[map.type] ?? '').trim().toLowerCase();
      const isDebit = type ? type.startsWith('d') : parsed?.direction === 'debit';
      if (parsed && isDebit) amount = parsed.paise;
    }
    if (amount) expenses.push({ date, amount, raw });
  }
  return expenses;
}

const NOISE = new Set([
  'upi', 'dr', 'cr', 'p2m', 'p2a', 'mb', 'imps', 'neft', 'rtgs', 'pos', 'ecom', 'ach', 'nach', 'payment', 'phonepe',
  'gpay', 'bhim', 'mmt', 'inb', 'ib', 'bil', 'billpay', 'onl', 'txn', 'ref', 'to', 'by', 'from', 'transfer', 'trf', 'collect', 'request',
  'purchase', 'debit', 'card', 'vps', 'vin', 'oid', 'intent', 'upiintent', 'sent', 'using', 'via', 'yes', 'ok',
  // Bank short codes and UPI handles that show up as their own segment.
  'yesb', 'sbin', 'hdfc', 'icic', 'utib', 'kkbk', 'punb', 'barb', 'ubin', 'cnrb', 'idib', 'ioba', 'pytm', 'indb', 'fdrl', 'idfb',
  'hdfcbank', 'icicibank', 'axisbank', 'axis', 'sbi', 'yesbank', 'kotak', 'ybl', 'okaxis', 'oksbi', 'okhdfcbank', 'okicici', 'ibl',
  'axl', 'apl', 'paytm',
]);
const SUFFIXES = new Set([
  'pvt', 'private', 'ltd', 'limited', 'llp', 'inc', 'india', 'technologies', 'technology', 'tech', 'services', 'solutions',
  'retail', 'online', 'internet', 'commerce', 'ecommerce', 'co', 'systems', 'enterprises', 'and',
  // Cities that card terminals append ("AMAZON MUMBAI").
  'mumbai', 'delhi', 'bangalore', 'bengaluru', 'gurgaon', 'gurugram', 'noida', 'pune', 'hyderabad', 'chennai', 'kolkata', 'ahmedabad',
]);

/** Legal names that don't look like the brand people know. Checked as substrings of the narration. */
const ALIASES: [RegExp, string][] = [
  [/one ?97/i, 'Paytm'],
  [/bundl tech/i, 'Swiggy'],
  [/ani tech/i, 'Ola'],
  [/grofers/i, 'Blinkit'],
  [/bharti airtel/i, 'Airtel'],
  [/reliance jio/i, 'Jio'],
  [/irctc/i, 'IRCTC'],
];

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Meaningful words of one narration segment: no noise, references, masked card numbers or company suffixes. */
function nameWords(segment: string): string[] {
  return segment
    .replace(/[^a-z0-9&' ]/gi, ' ')
    .split(/\s+/)
    .filter((word) => word && !/\d/.test(word) && !/^x{3,}$/i.test(word))
    .filter((word) => !NOISE.has(word.toLowerCase()) && !SUFFIXES.has(word.toLowerCase()));
}

/**
 * Turns a raw bank narration into a merchant name:
 * "UPI/DR/412345678901/SWIGGY/YESB/swiggy@ybl/Payment" → "Swiggy",
 * "UPI-ZOMATO LTD-zomato@hdfc-HDFC0000001-123456-UPI" → "Zomato".
 */
export function cleanMerchant(raw: string): string {
  for (const [pattern, name] of ALIASES) if (pattern.test(raw)) return name;
  if (/\batm\b/i.test(raw)) return 'ATM cash';
  // Slash-separated narrations keep hyphens inside names ("Taj-Mahal"); otherwise hyphens separate fields.
  const separator = /[/|]/.test(raw) ? /[/|:*]+/ : /[-|:*]+/;
  const segments = raw.split(separator).map((t) => t.trim()).filter(Boolean);
  for (const segment of segments) {
    if (segment.includes('@')) continue;
    if (/^[a-z]{4}0[a-z0-9]{6}$/i.test(segment)) continue; // IFSC code
    const words = nameWords(segment);
    if (words.join('').length >= 3) return titleCase(words.join(' '));
  }
  const vpa = segments.find((t) => t.includes('@'));
  const local = vpa ? nameWords(vpa.split('@')[0]!.replace(/[._]/g, ' ')) : [];
  if (local.join('').length >= 3) return titleCase(local.join(' '));
  return /upi/i.test(raw) ? 'UPI transfer' : 'Unknown';
}

/**
 * Keys that identify each statement line, so a re-import skips it. Identical
 * lines on the same day (two ₹500 ATM withdrawals) get an occurrence number,
 * which stays the same when the same file is imported again.
 */
export function importKeys(expenses: StatementExpense[]): string[] {
  const seen = new Map<string, number>();
  return expenses.map((e) => {
    const base = `${e.date}|${e.amount}|${e.raw.toLowerCase()}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}#${n}`;
  });
}
