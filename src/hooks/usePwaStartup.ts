import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import {
  applyUpdate,
  checkForUpdate,
  registerServiceWorker,
  requestPersistentStorage,
  watchForUpdate,
} from '@/lib/web/pwa';

/**
 * Web only: installs the offline service worker, asks Safari to keep the
 * database, and reports when a new version is ready. `update()` switches to it
 * and reloads. Without this, a home-screen app left in the app switcher would
 * keep serving the old shell (and its old CSP) indefinitely.
 */
export function usePwaStartup(): { updateReady: boolean; update: () => void } {
  const [updateReady, setUpdateReady] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    const container = navigator.serviceWorker;

    const onVisible = () => {
      if (document.visibilityState === 'visible' && registration.current) {
        void checkForUpdate(registration.current);
      }
    };

    void registerServiceWorker<ServiceWorkerRegistration>(navigator, { isDev: __DEV__ }, (reg) => {
      registration.current = reg;
      watchForUpdate(reg, { hasController: () => !!container?.controller }, () => setUpdateReady(true));
      document.addEventListener('visibilitychange', onVisible);
    });
    void requestPersistentStorage(navigator);

    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const update = useCallback(() => {
    if (registration.current && navigator.serviceWorker) {
      applyUpdate(registration.current, navigator.serviceWorker, () => window.location.reload());
    }
  }, []);

  return { updateReady, update };
}
