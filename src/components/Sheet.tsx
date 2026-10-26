import { useEffect, type ReactNode } from 'react';

/** Full-height bottom sheet. Closes on backdrop tap and Escape. */
export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex max-h-[calc(100%-env(safe-area-inset-top)-12px)] flex-col rounded-t-3xl bg-zinc-50 pb-[env(safe-area-inset-bottom)] shadow-2xl dark:bg-zinc-900"
      >
        {children}
      </div>
    </div>
  );
}
