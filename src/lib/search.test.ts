import { describe, expect, it } from 'vitest';

import { matchesSearch } from './search';

const chai = { amount: 4050, note: 'Chai at office' };

describe('matchesSearch', () => {
  it('matches note and category text, case-insensitively', () => {
    expect(matchesSearch(chai, 'Food', 'chai')).toBe(true);
    expect(matchesSearch(chai, 'Food', 'FOOD')).toBe(true);
    expect(matchesSearch(chai, 'Food', 'office chai')).toBe(true);
    expect(matchesSearch(chai, 'Food', 'uber')).toBe(false);
  });

  it('matches whole rupee amounts', () => {
    expect(matchesSearch(chai, 'Food', '40')).toBe(true);
    expect(matchesSearch(chai, 'Food', '₹40')).toBe(true);
    expect(matchesSearch(chai, 'Food', '4')).toBe(false);
    expect(matchesSearch({ amount: 14000, note: '' }, 'Food', '40')).toBe(false);
    expect(matchesSearch({ amount: 120000, note: '' }, 'Food', '1,200')).toBe(true);
  });

  it('matches decimal amounts exactly', () => {
    expect(matchesSearch(chai, 'Food', '40.50')).toBe(true);
    expect(matchesSearch(chai, 'Food', '₹40.5')).toBe(true);
    expect(matchesSearch(chai, 'Food', '40.05')).toBe(false);
  });

  it('matches everything for an empty query', () => {
    expect(matchesSearch(chai, 'Food', '  ')).toBe(true);
  });
});
