import { describe, expect, it, vi } from 'vitest';

vi.mock('../db', () => ({ db: {} }));
const { describeStartupError } = await import('./Recovery');

describe('describeStartupError', () => {
  it('tells private-browsing / blocked storage apart from a full disk and an update', () => {
    expect(describeStartupError({ name: 'MissingAPIError' }).title).toMatch(/can’t open its storage/);
    expect(describeStartupError({ name: 'OpenFailedError', inner: { name: 'QuotaExceededError' } }).title).toMatch(/full/);
    expect(describeStartupError({ name: 'VersionError' }).title).toMatch(/updated/);
    expect(describeStartupError(new Error('boom')).title).toBe('Something went wrong');
  });
});
