import { describe, expect, it } from 'vitest';

import { quickParse } from './quickParse';

const TODAY = '2026-10-26'; // a Monday

describe('quickParse', () => {
  it('reads amount and note, guessing the category', () => {
    expect(quickParse('chai 40', TODAY)).toEqual({ amount: 4000, note: 'chai', date: null, categoryId: 'food' });
    expect(quickParse('chai 40 today', TODAY).date).toBe(TODAY);
  });

  it('understands yesterday and weekdays', () => {
    expect(quickParse('uber 320 yesterday', TODAY)).toMatchObject({ amount: 32000, date: '2026-10-25', categoryId: 'transport' });
    expect(quickParse('movie 500 sat', TODAY).date).toBe('2026-10-24');
    expect(quickParse('lunch 200 monday', TODAY).date).toBe('2026-10-19');
  });

  it('reads ordinals as the latest such day, never the future', () => {
    expect(quickParse('rent 15k 1st', TODAY)).toMatchObject({ amount: 1500000, date: '2026-10-01', categoryId: 'rent' });
    expect(quickParse('gift 999 28th', TODAY).date).toBe('2026-09-28');
  });

  it('reads d/m dates', () => {
    expect(quickParse('jio 299 5/10', TODAY).date).toBe('2026-10-05');
    expect(quickParse('trip 4000 25/12', TODAY).date).toBe('2025-12-25');
  });

  it('accepts the amount anywhere and keeps unknown notes uncategorised', () => {
    expect(quickParse('₹1,200 birthday gift', TODAY)).toEqual({
      amount: 120000,
      note: 'birthday gift',
      date: null,
      categoryId: null,
    });
  });

  it('leaves amount empty when there is none', () => {
    expect(quickParse('coffee', TODAY)).toMatchObject({ amount: null, note: 'coffee', categoryId: 'food' });
  });

  it('uses only the first number as the amount', () => {
    expect(quickParse('2 coffee 300', TODAY)).toMatchObject({ amount: 200, note: 'coffee 300' });
  });
});
