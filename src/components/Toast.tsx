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
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const hide = useCallback(() => {
    setVisible(false);
    // Let it slide out before removing it.
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 250);
  }, []);

  const show = useCallback(
    (message: string, action?: ToastAction) => {
      window.clearTimeout(timer.current);
      // Paint it hidden first, then reveal on the frame after, so it slides in (also when replacing a toast).
      setVisible(false);
      setToast({ id: Date.now(), message, action });
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      // Longer when there is something to undo.
      timer.current = window.setTimeout(hide, action ? 7000 : 3500);
    },
    [hide],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-50 flex justify-center px-4">
          <div
            key={toast.id}
            role="status"
            className={`toast-motion pointer-events-auto flex items-center gap-4 rounded-full bg-zinc-900 py-2.5 pr-2.5 pl-5 text-sm text-white shadow-lg transition-[opacity,transform] duration-250 ease-out will-change-transform dark:bg-zinc-100 dark:text-zinc-900 ${
              visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'
            }`}
          >
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                className="rounded-full px-3 py-1 font-semibold text-emerald-400 transition-transform active:scale-95 dark:text-emerald-600"
                onClick={() => {
                  toast.action?.onPress();
                  hide();
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
