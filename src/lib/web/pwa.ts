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

export async function registerServiceWorker<R>(
  nav: { serviceWorker?: ServiceWorkerLike } | undefined,
  { isDev }: { isDev: boolean },
  onRegistration?: (registration: R) => void,
): Promise<ServiceWorkerResult> {
  // Metro's dev server serves no sw.js; registering would cache dev bundles.
  if (isDev) return 'skipped-dev';
  if (!nav?.serviceWorker) return 'unsupported';
  try {
    const registration = await nav.serviceWorker.register('/sw.js', { scope: '/' });
    onRegistration?.(registration as R);
    return 'registered';
  } catch {
    return 'failed';
  }
}

interface EventSource {
  addEventListener: (type: string, listener: () => void) => void;
}

interface WorkerLike extends EventSource {
  state: string;
}

interface RegistrationLike extends EventSource {
  waiting: object | null;
  installing: WorkerLike | object | null;
}

/**
 * Calls `onReady` once a new version has installed and is waiting to replace
 * the running one. Not on the very first install (no controller yet): there is
 * nothing to replace, and the page is already the latest version.
 */
export function watchForUpdate(
  registration: RegistrationLike,
  { hasController }: { hasController: boolean },
  onReady: () => void,
): void {
  if (!hasController) return;
  if (registration.waiting) {
    onReady();
    return;
  }
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing as WorkerLike | null;
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') onReady();
    });
  });
}

/**
 * Tells the waiting worker to take over, then reloads once it controls the
 * page. Person-initiated, so no migration runs under a half-updated app.
 */
export function applyUpdate(
  registration: { waiting: { postMessage: (message: unknown) => void } | null },
  container: EventSource,
  reload: () => void,
): void {
  if (!registration.waiting) return;
  let reloaded = false;
  container.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    reload();
  });
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

/** Asks the browser to re-fetch sw.js now, e.g. when the app returns to the foreground. */
export async function checkForUpdate(registration: { update: () => Promise<unknown> }): Promise<void> {
  try {
    await registration.update();
  } catch {
    // Offline or a transient failure; the next foreground check retries.
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
