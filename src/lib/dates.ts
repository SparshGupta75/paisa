/** Dates are local calendar days as "YYYY-MM-DD" strings, never UTC instants. */

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** "Today", "Yesterday", or "Mon, 20 Oct" (plus the year when it isn't this year). */
export function dayLabel(iso: string, today: string): string {
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  const date = fromISODate(iso);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** "2026-10" for any date in October 2026. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}
