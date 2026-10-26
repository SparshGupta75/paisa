import { describe, expect, it } from 'vitest';

import { firstGrapheme } from './emoji';

describe('firstGrapheme', () => {
  it('keeps one whole emoji, including joined ones', () => {
    expect(firstGrapheme('🍕🍔')).toBe('🍕');
    expect(firstGrapheme('👨‍👩‍👧 family')).toBe('👨‍👩‍👧');
    expect(firstGrapheme(' A')).toBe('A');
    expect(firstGrapheme('')).toBe('');
  });
});
