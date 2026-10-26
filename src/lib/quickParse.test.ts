import { describe, expect, it } from 'vitest';

import { quickParse, shareOf } from './quickParse';

const TODAY = '2026-10-26'; // a Monday

describe('quickParse', () => {
  it('reads amount and note, guessing the category', () => {
    expect(quickParse('chai 40', TODAY)).toEqual({ type: 'expense', amount: 4000, splitWays: null, note: 'chai', date: null, categoryId: 'food' });
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
      type: 'expense',
      amount: 120000,
      splitWays: null,
      note: 'birthday gift',
      date: null,
      categoryId: null,
    });
  });

  it('leaves amount empty when there is none', () => {
    expect(quickParse('coffee', TODAY)).toMatchObject({ amount: null, note: 'coffee', categoryId: 'food' });
  });

  it('recognises money in', () => {
    expect(quickParse('+200 rahul', TODAY)).toEqual({ type: 'income', amount: 20000, splitWays: null, note: 'rahul', date: null, categoryId: 'people' });
    expect(quickParse('got 200 from rahul yesterday', TODAY)).toMatchObject({
      type: 'income',
      amount: 20000,
      note: 'rahul',
      date: '2026-10-25',
      categoryId: 'people',
    });
    expect(quickParse('salary 50k', TODAY)).toMatchObject({ type: 'income', amount: 5000000, note: 'salary', categoryId: 'salary' });
    expect(quickParse('amazon refund 499', TODAY)).toMatchObject({ type: 'income', categoryId: 'refund' });
    expect(quickParse('received 1000', TODAY)).toMatchObject({ type: 'income', note: '', categoryId: 'people' });
  });

  it('keeps ordinary expenses that merely mention from / credit / income', () => {
    expect(quickParse('uber from airport 300', TODAY)).toMatchObject({ type: 'expense', note: 'uber from airport' });
    expect(quickParse('credit card bill 5000', TODAY).type).toBe('expense');
    expect(quickParse('income tax 700', TODAY).type).toBe('expense');
    expect(quickParse('massage back 500', TODAY).type).toBe('expense');
  });

  it('understands splits', () => {
    expect(quickParse('dinner 200 split', TODAY)).toMatchObject({ amount: 20000, splitWays: 2, note: 'dinner', categoryId: 'food' });
    expect(quickParse('dinner 900 split 3 yesterday', TODAY)).toMatchObject({ amount: 90000, splitWays: 3, date: '2026-10-25' });
    expect(quickParse('split 200 cab', TODAY)).toMatchObject({ amount: 20000, splitWays: 2, note: 'cab' });
    expect(quickParse('dinner split 3 900', TODAY)).toMatchObject({ amount: 90000, splitWays: 3 });
    expect(quickParse('lunch 2500 split 25', TODAY)).toMatchObject({ amount: 250000, splitWays: 25 });
    expect(shareOf(20000, 2)).toBe(10000);
    expect(shareOf(10000, 3)).toBe(3334);
  });

  it('uses only the first number as the amount', () => {
    expect(quickParse('2 coffee 300', TODAY)).toMatchObject({ amount: 200, note: 'coffee 300' });
  });
});
