import { describe, expect, it } from 'vitest';

import { budgetStatus } from './budget';

describe('budgetStatus', () => {
  it('spreads the remaining budget over the days left, today included', () => {
    // 26 Oct: 6 days left (26–31). ₹30,000 budget, ₹18,000 spent before today.
    const status = budgetStatus({ budget: 3_000_000, spentThisMonth: 1_800_000, spentToday: 0, today: '2026-10-26' });
    expect(status.daysLeft).toBe(6);
    expect(status.perDay).toBe(200_000);
    expect(status.leftToday).toBe(200_000);
    expect(status.remaining).toBe(1_200_000);
    expect(status.used).toBeCloseTo(0.6);
  });

  it('subtracts what was already spent today', () => {
    const status = budgetStatus({ budget: 3_000_000, spentThisMonth: 1_850_000, spentToday: 50_000, today: '2026-10-26' });
    expect(status.perDay).toBe(200_000);
    expect(status.leftToday).toBe(150_000);
  });

  it('never goes below zero when over budget', () => {
    const status = budgetStatus({ budget: 1_000_000, spentThisMonth: 1_200_000, spentToday: 0, today: '2026-10-26' });
    expect(status.leftToday).toBe(0);
    expect(status.perDay).toBe(0);
    expect(status.remaining).toBe(-200_000);
    expect(status.used).toBeCloseTo(1.2);
  });

  it('rounds down to whole rupees', () => {
    // (3100 - 300) / 6 = 466.66 → 466; minus 200 spent today → 266.
    const status = budgetStatus({ budget: 310_000, spentThisMonth: 50_000, spentToday: 20_000, today: '2026-10-26' });
    expect(status.perDay).toBe(46_600);
    expect(status.leftToday).toBe(26_600);
  });

  it('handles the last day and February', () => {
    expect(budgetStatus({ budget: 100, spentThisMonth: 0, spentToday: 0, today: '2026-10-31' }).daysLeft).toBe(1);
    expect(budgetStatus({ budget: 100, spentThisMonth: 0, spentToday: 0, today: '2028-02-01' }).daysLeft).toBe(29);
  });
});
