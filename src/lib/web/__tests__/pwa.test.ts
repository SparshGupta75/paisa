import { registerServiceWorker, requestPersistentStorage } from '../pwa';

describe('registerServiceWorker', () => {
  it('skips registration in development, where Metro serves no worker', async () => {
    const register = jest.fn();
    const result = await registerServiceWorker({ serviceWorker: { register } }, { isDev: true });
    expect(result).toBe('skipped-dev');
    expect(register).not.toHaveBeenCalled();
  });

  it('reports unsupported when the browser has no service worker API', async () => {
    expect(await registerServiceWorker({}, { isDev: false })).toBe('unsupported');
    expect(await registerServiceWorker(undefined, { isDev: false })).toBe('unsupported');
  });

  it('registers /sw.js at the root scope', async () => {
    const register = jest.fn().mockResolvedValue({});
    const result = await registerServiceWorker({ serviceWorker: { register } }, { isDev: false });
    expect(result).toBe('registered');
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('reports failure instead of throwing, so a bad worker never blocks the app', async () => {
    const register = jest.fn().mockRejectedValue(new Error('boom'));
    expect(await registerServiceWorker({ serviceWorker: { register } }, { isDev: false })).toBe('failed');
  });
});

describe('requestPersistentStorage', () => {
  it('reports unsupported when the Storage API is missing', async () => {
    expect(await requestPersistentStorage({})).toBe('unsupported');
    expect(await requestPersistentStorage(undefined)).toBe('unsupported');
  });

  it('does not ask again when storage is already persistent', async () => {
    const persist = jest.fn();
    const result = await requestPersistentStorage({
      storage: { persisted: jest.fn().mockResolvedValue(true), persist },
    });
    expect(result).toBe('persisted');
    expect(persist).not.toHaveBeenCalled();
  });

  it('asks once and reports the browser decision', async () => {
    const granted = await requestPersistentStorage({
      storage: { persisted: jest.fn().mockResolvedValue(false), persist: jest.fn().mockResolvedValue(true) },
    });
    const denied = await requestPersistentStorage({
      storage: { persisted: jest.fn().mockResolvedValue(false), persist: jest.fn().mockResolvedValue(false) },
    });
    expect(granted).toBe('persisted');
    expect(denied).toBe('denied');
  });

  it('reports denied instead of throwing when the browser errors', async () => {
    const result = await requestPersistentStorage({
      storage: { persisted: jest.fn().mockRejectedValue(new Error('nope')), persist: jest.fn() },
    });
    expect(result).toBe('denied');
  });
});
