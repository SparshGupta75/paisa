import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastState {
  id: number;
  message: string;
  action?: ToastAction;
}

const ToastContext = createContext<(message: string, action?: ToastAction) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((message: string, action?: ToastAction) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, action });
    timer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-50 flex justify-center px-4">
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-center gap-4 rounded-full bg-zinc-900 py-2.5 pr-2.5 pl-5 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
          >
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                className="rounded-full px-3 py-1 font-semibold text-emerald-400 dark:text-emerald-600"
                onClick={() => {
                  toast.action?.onPress();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
