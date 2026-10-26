import { describe, expect, it } from 'vitest';

import { heatLevels, leadingBlanks, monthlyTrend, shiftMonth, summarizeMonth } from './insights';

const t = (date: string, rupees: number, categoryId = 'food') => ({ date, amount: rupees * 100, categoryId });

describe('summarizeMonth', () => {
  const txns = [
    t('2026-09-05', 1000),
    t('2026-09-20', 5000, 'rent'), // after the 10th: not in a 10 Oct comparison
    t('2026-10-02', 600),
    t('2026-10-09', 600, 'transport'),
    t('2026-10-10', 300),
  ];

  it('compares the current month with the same span of last month', () => {
    const s = summarizeMonth(txns, '2026-10', '2026-10-10');
    expect(s.total).toBe(150000);
    expect(s.previous).toBe(100000);
    expect(s.change).toBeCloseTo(0.5);
  });

  it('projects the month end from the daily pace', () => {
    // ₹1,500 in 10 days of a 31-day month → ₹4,650.
    expect(summarizeMonth(txns, '2026-10', '2026-10-10').projected).toBe(465000);
    // ₹1,500 in 13 days → 3,576.92 → ₹3,577.
    expect(summarizeMonth(txns, '2026-10', '2026-10-13').projected).toBe(357700);
    expect(summarizeMonth(txns, '2026-10', '2026-10-02').projected).toBeNull();
    expect(summarizeMonth(txns, '2026-09', '2026-10-10').projected).toBeNull();
  });

  it('compares a past month against the whole previous month', () => {
    expect(summarizeMonth(txns, '2026-09', '2026-10-10')).toMatchObject({ total: 600000, previous: 0, change: null });
  });

  it('breaks down by category, biggest first, with last month for comparison', () => {
    expect(summarizeMonth(txns, '2026-10', '2026-10-10').byCategory).toEqual([
      { categoryId: 'food', total: 90000, previous: 100000 },
      { categoryId: 'transport', total: 60000, previous: 0 },
    ]);
  });

  it('totals each day', () => {
    const daily = summarizeMonth(txns, '2026-10', '2026-10-10').daily;
    expect(daily).toHaveLength(31);
    expect(daily[1]).toBe(60000);
    expect(daily[9]).toBe(30000);
  });
});

describe('helpers', () => {
  it('shifts months across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('builds a trend, oldest first, including empty months', () => {
    expect(monthlyTrend([t('2026-10-01', 10), t('2026-08-01', 5)], '2026-10', 3)).toEqual([
      { month: '2026-08', total: 500 },
      { month: '2026-09', total: 0 },
      { month: '2026-10', total: 1000 },
    ]);
  });

  it('shades days by quartile', () => {
    expect(heatLevels([0, 100, 200, 300, 400])).toEqual([0, 1, 2, 3, 4]);
    expect(heatLevels([0, 0])).toEqual([0, 0]);
  });

  it('starts calendars on Monday', () => {
    expect(leadingBlanks('2026-10')).toBe(3); // 1 Oct 2026 is a Thursday
    expect(leadingBlanks('2026-06')).toBe(0); // 1 Jun 2026 is a Monday
  });
});
