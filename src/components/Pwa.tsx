import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

import { useToast } from './Toast';

/** True when running as the installed Home Screen app rather than a browser tab. */
export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/**
 * Registers the offline service worker. When a new version has downloaded,
 * asks before switching to it (instead of reloading under your fingers), and
 * asks the browser to keep Paisa's data even when space runs low.
 */
export function PwaUpdates() {
  const toast = useToast();
  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        toast('A new version of Paisa is ready', {
          sticky: true,
          actions: [{ label: 'Update', onPress: () => void update(true) }],
        });
      },
    });
    void navigator.storage?.persist?.();
  }, [toast]);
  return null;
}

const DISMISSED = 'paisa:install-hint-dismissed';

/** In a browser tab: explains how (and why) to install Paisa to the Home Screen. */
export function InstallHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED) === '1';
    } catch {
      // Storage blocked: just show it.
    }
    setShow(!isInstalled() && !dismissed);
  }, []);
  if (!show) return null;

  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return (
    <div className="mb-3 flex items-start gap-3 rounded-2xl bg-emerald-500/10 p-4">
      <span className="text-2xl" aria-hidden>
        📲
      </span>
      <div className="flex-1 text-sm">
        <p className="font-semibold">Install Paisa</p>
        <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
          {ios ? 'Tap Share, then “Add to Home Screen”.' : 'Use your browser’s “Install app” or “Add to Home screen”.'} It opens like an app,
          works offline and keeps your data safer.
        </p>
      </div>
      <button
        aria-label="Dismiss install tip"
        className="no-press -m-1 rounded-full p-1 text-zinc-400"
        onClick={() => {
          setShow(false);
          try {
            localStorage.setItem(DISMISSED, '1');
          } catch {
            // Not remembered; fine.
          }
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
}
