import { describe, expect, it } from 'vitest';

import { categorize } from './rules';

const ids = new Set(['food', 'transport', 'shopping', 'other', 'pets']);

describe('categorize', () => {
  it('prefers a learned rule', () => {
    expect(categorize('Swiggy', new Map([['swiggy', 'shopping']]), ids)).toBe('shopping');
  });
  it('falls back to keywords, then Other', () => {
    expect(categorize('Swiggy', new Map(), ids)).toBe('food');
    expect(categorize('Uber', new Map(), ids)).toBe('transport');
    expect(categorize('Rahul Sharma', new Map(), ids)).toBe('other');
  });
  it('ignores rules for deleted categories', () => {
    expect(categorize('Zoo', new Map([['zoo', 'gone']]), ids)).toBe('other');
  });
});
