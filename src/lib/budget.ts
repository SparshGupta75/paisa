import { fromISODate } from './dates';

export interface BudgetStatus {
  /** What can still be spent today without going over the month. Never negative. */
  leftToday: number;
  /** The even daily allowance for the rest of the month, today included. */
  perDay: number;
  /** Budget minus everything spent this month. Negative when over. */
  remaining: number;
  /** Days left in the month, today included. */
  daysLeft: number;
  /** Share of the budget used, 0–1+ (can exceed 1). */
  used: number;
}

/**
 * "Safe to spend today": spread what was left at the start of today evenly
 * over the remaining days (today included), then subtract today's spending.
 */
export function budgetStatus({
  budget,
  spentThisMonth,
  spentToday,
  today,
}: {
  budget: number;
  spentThisMonth: number;
  spentToday: number;
  today: string;
}): BudgetStatus {
  const date = fromISODate(today);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - date.getDate() + 1;
  const leftAtStartOfToday = budget - (spentThisMonth - spentToday);
  // Whole rupees: a headline number, and rounding down keeps it safe.
  const perDay = Math.max(0, Math.floor(leftAtStartOfToday / daysLeft / 100) * 100);
  return {
    leftToday: Math.max(0, Math.floor((perDay - spentToday) / 100) * 100),
    perDay,
    remaining: budget - spentThisMonth,
    daysLeft,
    used: budget > 0 ? spentThisMonth / budget : 0,
  };
}
