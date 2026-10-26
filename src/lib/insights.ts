import { fromISODate, monthKey, toISODate } from './dates';

interface Spend {
  amount: number;
  date: string;
  categoryId: string;
}

export function daysInMonth(month: string): number {
  const [y = 0, m = 1] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function shiftMonth(month: string, by: number): string {
  const [y = 0, m = 1] = month.split('-').map(Number);
  return toISODate(new Date(y, m - 1 + by, 1)).slice(0, 7);
}

/** "October 2026". */
export function monthLabel(month: string): string {
  return fromISODate(`${month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

const sum = (txns: Spend[]) => txns.reduce((total, t) => total + t.amount, 0);

export interface MonthSummary {
  total: number;
  /** Spending in the previous month over the same span (up to the same day for the current month). */
  previous: number;
  /** Change vs `previous` as a fraction, or null when there's nothing to compare with. */
  change: number | null;
  /** Linear projection to month end, only for the current month after a few days. */
  projected: number | null;
  byCategory: { categoryId: string; total: number; previous: number }[];
  /** Total per day of the month, index 0 = day 1. */
  daily: number[];
}

export function summarizeMonth(txns: Spend[], month: string, today: string): MonthSummary {
  const isCurrent = monthKey(today) === month;
  const dayCutoff = isCurrent ? fromISODate(today).getDate() : 31;
  const previousMonth = shiftMonth(month, -1);

  const inMonth = txns.filter((t) => monthKey(t.date) === month);
  // Compare like with like: on 10 Oct, compare against 1–10 Sep, not all of September.
  const inPrevious = txns.filter((t) => monthKey(t.date) === previousMonth && Number(t.date.slice(8)) <= dayCutoff);

  const total = sum(inMonth);
  const previous = sum(inPrevious);
  const day = fromISODate(today).getDate();

  const categories = new Map<string, { total: number; previous: number }>();
  for (const t of inMonth) categories.set(t.categoryId, { ...(categories.get(t.categoryId) ?? { total: 0, previous: 0 }), total: (categories.get(t.categoryId)?.total ?? 0) + t.amount });
  for (const t of inPrevious) {
    const entry = categories.get(t.categoryId);
    if (entry) entry.previous += t.amount;
  }

  const daily = Array.from({ length: daysInMonth(month) }, () => 0);
  for (const t of inMonth) daily[Number(t.date.slice(8)) - 1]! += t.amount;

  return {
    total,
    previous,
    change: previous > 0 ? (total - previous) / previous : null,
    // Whole rupees: it's an estimate.
    projected: isCurrent && day >= 3 ? Math.round((total / day) * daysInMonth(month) / 100) * 100 : null,
    byCategory: [...categories].map(([categoryId, v]) => ({ categoryId, ...v })).sort((a, b) => b.total - a.total),
    daily,
  };
}

/** Totals for the `count` months ending with `month`, oldest first. */
export function monthlyTrend(txns: Spend[], month: string, count = 6): { month: string; total: number }[] {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(month, i - count + 1));
  const totals = new Map(months.map((m) => [m, 0]));
  for (const t of txns) {
    const key = monthKey(t.date);
    if (totals.has(key)) totals.set(key, totals.get(key)! + t.amount);
  }
  return months.map((m) => ({ month: m, total: totals.get(m)! }));
}

/** Heatmap shade 0–4 for each day: 0 for nothing, then quartiles of the days that had spending. */
export function heatLevels(daily: number[]): number[] {
  const spent = daily.filter((d) => d > 0).sort((a, b) => a - b);
  if (spent.length === 0) return daily.map(() => 0);
  const q = (p: number) => spent[Math.max(0, Math.ceil(p * spent.length) - 1)]!;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  return daily.map((d) => (d === 0 ? 0 : d <= q1 ? 1 : d <= q2 ? 2 : d <= q3 ? 3 : 4));
}

/** Blank cells before day 1 in a Monday-first calendar. */
export function leadingBlanks(month: string): number {
  return (fromISODate(`${month}-01`).getDay() + 6) % 7;
}
