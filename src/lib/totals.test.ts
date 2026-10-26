import { describe, expect, it } from 'vitest';

import { receivedOf, spentOf } from './totals';

describe('totals', () => {
  // Spent ₹1,000, split a ₹200 dinner two ways, got ₹200 from a friend.
  const day = [{ amount: 100000 }, { amount: 20000, share: 10000 }, { amount: 20000, type: 'income' as const }];

  it('counts your share of splits and leaves money in out of spending', () => {
    expect(spentOf(day)).toBe(110000);
    expect(receivedOf(day)).toBe(20000);
  });
});
