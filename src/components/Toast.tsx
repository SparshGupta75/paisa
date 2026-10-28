import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  actions?: ToastAction[];
  /** Stays until an action is tapped or it's replaced (for things that need a decision). */
  sticky?: boolean;
  /** Something went wrong: shown in red so it can't be mistaken for success. */
  error?: boolean;
}

interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

/** `toast(message)`, `toast(message, { label, onPress })` or `toast(message, { actions, sticky, error })`. */
type Show = (message: string, options?: ToastAction | ToastOptions) => void;

const ToastContext = createContext<Show>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const hide = useCallback(() => {
    setVisible(false);
    // Let it slide out before removing it.
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 250);
  }, []);

  const show = useCallback<Show>(
    (message, options) => {
      const opts: ToastOptions = options && 'label' in options ? { actions: [options] } : (options ?? {});
      window.clearTimeout(timer.current);
      // Paint it hidden first, then reveal on the frame after, so it slides in (also when replacing a toast).
      setVisible(false);
      setToast({ id: Date.now(), message, ...opts });
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      // Longer when there is something to act on; errors stay until read.
      if (!opts.sticky) timer.current = window.setTimeout(hide, opts.actions?.length || opts.error ? 7000 : 3500);
    },
    [hide],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <div
          className={`pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4 ${
            // Errors go to the top, clear of an open sheet's keypad and buttons.
            toast.error ? 'top-[calc(env(safe-area-inset-top)+12px)]' : 'bottom-[calc(env(safe-area-inset-bottom)+96px)]'
          }`}
        >
          <div
            key={toast.id}
            role={toast.error ? 'alert' : 'status'}
            className={`toast-motion pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl py-2.5 pr-2 pl-4 text-sm shadow-lg transition-[opacity,transform] duration-250 ease-out will-change-transform ${
              toast.error ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            } ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'}`}
          >
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.actions?.map((action) => (
              <button
                key={action.label}
                className={`shrink-0 rounded-full px-3 py-1 font-semibold ${
                  toast.error ? 'bg-white/15 text-white' : 'text-emerald-400 dark:text-emerald-600'
                }`}
                onClick={() => {
                  action.onPress();
                  hide();
                }}
              >
                {action.label}
              </button>
            ))}
            {toast.sticky || toast.error ? (
              <button aria-label="Dismiss" className="shrink-0 rounded-full px-2 py-1 opacity-70" onClick={hide}>
                ✕
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
