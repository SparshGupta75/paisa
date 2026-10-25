import vm from 'node:vm';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildServiceWorker } = require('../precache');

const ORIGIN = 'https://paisa.test';
const VERSION = 'abc123def456';
const PRECACHE = ['/index.html', '/_expo/static/js/web/entry-abc.js'];

type Listener = (event: any) => void;

/** Runs the generated worker against fake service-worker globals. */
function loadWorker(existingCaches: string[] = []) {
  const listeners = new Map<string, Listener>();
  const stores = new Map<string, Map<string, string>>(existingCaches.map((name) => [name, new Map()]));
  const store = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name)!;
  };

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, fn: Listener) => listeners.set(type, fn),
    skipWaiting: jest.fn(() => Promise.resolve()),
    clients: { claim: jest.fn(() => Promise.resolve()) },
  };
  const caches = {
    open: async (name: string) => ({
      addAll: async (urls: string[]) => urls.forEach((url) => store(name).set(url, `cached:${url}`)),
    }),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (request: string | { url: string }, options: { cacheName: string }) => {
      const url = typeof request === 'string' ? request : new URL(request.url).pathname;
      return stores.get(options.cacheName)?.get(url);
    },
  };
  const fetch = jest.fn(async (request: { url: string }) => `network:${request.url}`);

  vm.runInNewContext(buildServiceWorker({ version: VERSION, files: PRECACHE }), {
    self,
    caches,
    fetch,
    URL,
    Promise,
  });

  async function dispatch(type: string, extra: Record<string, unknown> = {}) {
    const waits: Promise<unknown>[] = [];
    let response: Promise<unknown> | undefined;
    listeners.get(type)?.({
      ...extra,
      waitUntil: (p: Promise<unknown>) => waits.push(p),
      respondWith: (p: Promise<unknown>) => {
        response = p;
      },
    });
    await Promise.all(waits);
    return { responded: response !== undefined, response: await response };
  }

  return { self, stores, fetch, dispatch };
}

const request = (path: string, init: { method?: string; mode?: string; origin?: string } = {}) => ({
  url: `${init.origin ?? ORIGIN}${path}`,
  method: init.method ?? 'GET',
  mode: init.mode ?? 'cors',
});

describe('generated service worker', () => {
  it('precaches every file on install, into a versioned cache', async () => {
    const worker = loadWorker();
    await worker.dispatch('install');
    expect([...(worker.stores.get(`paisa-shell-${VERSION}`)?.keys() ?? [])]).toEqual(PRECACHE);
    expect(worker.self.skipWaiting).not.toHaveBeenCalled();
  });

  it('deletes older Paisa caches on activate, and leaves other caches alone', async () => {
    const worker = loadWorker(['paisa-shell-000000000000', 'someone-else']);
    await worker.dispatch('install');
    await worker.dispatch('activate');
    expect([...worker.stores.keys()].sort()).toEqual(['paisa-shell-abc123def456', 'someone-else']);
    expect(worker.self.clients.claim).toHaveBeenCalled();
  });

  it('answers every navigation with the cached shell, even offline', async () => {
    const worker = loadWorker();
    await worker.dispatch('install');
    const { response } = await worker.dispatch('fetch', { request: request('/settings', { mode: 'navigate' }) });
    expect(response).toBe('cached:/index.html');
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it('serves precached assets from the cache and falls back to the network otherwise', async () => {
    const worker = loadWorker();
    await worker.dispatch('install');
    expect((await worker.dispatch('fetch', { request: request('/_expo/static/js/web/entry-abc.js') })).response).toBe(
      'cached:/_expo/static/js/web/entry-abc.js',
    );
    expect((await worker.dispatch('fetch', { request: request('/not-cached.png') })).response).toBe(
      `network:${ORIGIN}/not-cached.png`,
    );
  });

  it('never touches non-GET or cross-origin requests', async () => {
    const worker = loadWorker();
    expect((await worker.dispatch('fetch', { request: request('/x', { method: 'POST' }) })).responded).toBe(false);
    expect((await worker.dispatch('fetch', { request: request('/x.js', { origin: 'https://evil.test' }) })).responded).toBe(
      false,
    );
  });

  it('activates a waiting update only when the page asks for it', async () => {
    const worker = loadWorker();
    await worker.dispatch('message', { data: { type: 'something-else' } });
    expect(worker.self.skipWaiting).not.toHaveBeenCalled();
    await worker.dispatch('message', { data: { type: 'SKIP_WAITING' } });
    expect(worker.self.skipWaiting).toHaveBeenCalledTimes(1);
  });
});
