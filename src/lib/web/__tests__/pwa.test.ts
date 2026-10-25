import {
  applyUpdate,
  checkForUpdate,
  registerServiceWorker,
  requestPersistentStorage,
  watchForUpdate,
} from '../pwa';

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

  it('hands the registration to the caller so it can watch for updates', async () => {
    const registration = { id: 'reg' };
    const onRegistration = jest.fn();
    await registerServiceWorker(
      { serviceWorker: { register: jest.fn().mockResolvedValue(registration) } },
      { isDev: false },
      onRegistration,
    );
    expect(onRegistration).toHaveBeenCalledWith(registration);
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

/** A minimal EventTarget-like fake. */
function emitter<T extends object>(props: T) {
  const handlers = new Map<string, (() => void)[]>();
  return Object.assign(props, {
    addEventListener: (type: string, fn: () => void) => handlers.set(type, [...(handlers.get(type) ?? []), fn]),
    emit: (type: string) => handlers.get(type)?.forEach((fn) => fn()),
  });
}

describe('watchForUpdate', () => {
  it('reports an update that is already waiting', () => {
    const onReady = jest.fn();
    watchForUpdate(emitter({ waiting: {}, installing: null }), { hasController: true }, onReady);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('reports an update once the new worker finishes installing', () => {
    const onReady = jest.fn();
    const installing = emitter({ state: 'installing' });
    const registration = emitter({ waiting: null as object | null, installing: null as object | null });
    watchForUpdate(registration, { hasController: true }, onReady);

    registration.installing = installing;
    registration.emit('updatefound');
    expect(onReady).not.toHaveBeenCalled();
    installing.state = 'installed';
    installing.emit('statechange');
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('stays quiet on the very first install, when nothing is being replaced', () => {
    const onReady = jest.fn();
    const installing = emitter({ state: 'installed' });
    const registration = emitter({ waiting: null, installing });
    watchForUpdate(registration, { hasController: false }, onReady);
    registration.emit('updatefound');
    installing.emit('statechange');
    expect(onReady).not.toHaveBeenCalled();
  });
});

describe('applyUpdate', () => {
  it('asks the waiting worker to take over, then reloads once it has', () => {
    const postMessage = jest.fn();
    const container = emitter({});
    const reload = jest.fn();
    applyUpdate({ waiting: { postMessage } }, container, reload);

    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(reload).not.toHaveBeenCalled();
    container.emit('controllerchange');
    container.emit('controllerchange');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no update is waiting', () => {
    const reload = jest.fn();
    applyUpdate({ waiting: null }, emitter({}), reload);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('checkForUpdate', () => {
  it('asks the browser to re-fetch sw.js and never throws', async () => {
    const update = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(checkForUpdate({ update })).resolves.toBeUndefined();
    expect(update).toHaveBeenCalled();
  });
});
