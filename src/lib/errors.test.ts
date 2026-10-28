import { describe, expect, it } from 'vitest';

import { saveErrorMessage } from './errors';

describe('saveErrorMessage', () => {
  it('explains a full storage, including when Dexie wraps the error', () => {
    expect(saveErrorMessage({ name: 'QuotaExceededError' })).toMatch(/full/);
    expect(saveErrorMessage({ name: 'AbortError', inner: { name: 'QuotaExceededError' } })).toMatch(/full/);
  });
  it('falls back to a reassuring retry message', () => {
    expect(saveErrorMessage(new Error('x'))).toMatch(/Nothing was lost/);
  });
});
