import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerServiceWorker, requestPersistentStorage } from '@/lib/web/pwa';

/**
 * Web only: installs the offline service worker and asks Safari to keep the
 * database. Fire-and-forget; neither result changes what the app renders.
 */
export function usePwaStartup(): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
    void registerServiceWorker(navigator, { isDev: __DEV__ });
    void requestPersistentStorage(navigator);
  }, []);
}
