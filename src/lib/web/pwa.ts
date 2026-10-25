/**
 * Browser-only start-up helpers for the installed web app. They take the
 * relevant part of `navigator` as an argument so they stay pure and testable,
 * and they never throw: a missing API or a refusal must not block the app.
 */

interface ServiceWorkerLike {
  register: (url: string, options: { scope: string }) => Promise<unknown>;
}

interface StorageLike {
  persisted: () => Promise<boolean>;
  persist: () => Promise<boolean>;
}

export type ServiceWorkerResult = 'registered' | 'unsupported' | 'skipped-dev' | 'failed';
export type PersistResult = 'persisted' | 'denied' | 'unsupported';

export async function registerServiceWorker(
  nav: { serviceWorker?: ServiceWorkerLike } | undefined,
  { isDev }: { isDev: boolean },
): Promise<ServiceWorkerResult> {
  // Metro's dev server serves no sw.js; registering would cache dev bundles.
  if (isDev) return 'skipped-dev';
  if (!nav?.serviceWorker) return 'unsupported';
  try {
    await nav.serviceWorker.register('/sw.js', { scope: '/' });
    return 'registered';
  } catch {
    return 'failed';
  }
}

/**
 * Asks the browser not to evict the database under storage pressure. Safari
 * decides by heuristics (it favours home-screen apps), so this is best-effort;
 * backups remain the real protection. See docs/ARCHITECTURE.md#sqlite-on-the-web.
 */
export async function requestPersistentStorage(
  nav: { storage?: StorageLike } | undefined,
): Promise<PersistResult> {
  const storage = nav?.storage;
  if (!storage || typeof storage.persist !== 'function' || typeof storage.persisted !== 'function') {
    return 'unsupported';
  }
  try {
    if (await storage.persisted()) return 'persisted';
    return (await storage.persist()) ? 'persisted' : 'denied';
  } catch {
    return 'denied';
  }
}
