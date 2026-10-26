import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const DURATION = 320;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.6; // px per ms

/**
 * Bottom sheet that slides up and down like iOS. Closes on backdrop tap,
 * Escape, or dragging the top edge down. While closing it keeps showing what
 * it last showed, so the content doesn't change as it slides away.
 *
 * Rendered into <body> so no ancestor (an animating tab, say) can become its
 * containing block or stacking context and put it under the tab bar.
 */
export function Sheet({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const dragStart = useRef<{ y: number; t: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLButtonElement>(null);
  const lastChildren = useRef(children);
  if (open) lastChildren.current = children;

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Two frames: mount off-screen first, then slide in.
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(frame);
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), DURATION);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  // Dragging writes the transform straight to the element: no React re-render
  // per finger movement, so it tracks the finger at full frame rate.
  const EASE = `${DURATION}ms cubic-bezier(0.32, 0.72, 0, 1)`;
  const onPointerDown = (event: PointerEvent) => {
    dragStart.current = { y: event.clientY, t: performance.now() };
    (event.target as Element).setPointerCapture?.(event.pointerId);
    if (panel.current) panel.current.style.transition = 'none';
    if (backdrop.current) backdrop.current.style.transition = 'none';
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragStart.current) return;
    const distance = Math.max(0, event.clientY - dragStart.current.y);
    if (panel.current) panel.current.style.transform = `translateY(${distance}px)`;
    if (backdrop.current) backdrop.current.style.opacity = String(Math.max(0, 1 - distance / 400));
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!dragStart.current) return;
    const distance = event.clientY - dragStart.current.y;
    const velocity = distance / Math.max(1, performance.now() - dragStart.current.t);
    dragStart.current = null;
    if (panel.current) panel.current.style.transition = `transform ${EASE}`;
    if (backdrop.current) backdrop.current.style.transition = `opacity ${DURATION}ms`;
    if (distance > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      if (panel.current) panel.current.style.transform = 'translateY(100%)';
      if (backdrop.current) backdrop.current.style.opacity = '0';
      onClose();
    } else {
      if (panel.current) panel.current.style.transform = 'translateY(0px)';
      if (backdrop.current) backdrop.current.style.opacity = '1';
    }
  };

  const visible = shown && open;

  return createPortal(
    <div className={`fixed inset-0 z-40 flex flex-col justify-end ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <button
        ref={backdrop}
        aria-label="Close"
        tabIndex={-1}
        className="sheet-motion no-press absolute inset-0 bg-black/40 transition-opacity"
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${DURATION}ms` }}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="sheet-motion relative flex max-h-[calc(100%-env(safe-area-inset-top)-12px)] flex-col rounded-t-3xl bg-zinc-50 pb-[env(safe-area-inset-bottom)] shadow-2xl will-change-transform dark:bg-zinc-900"
        style={{ transform: visible ? 'translateY(0px)' : 'translateY(100%)', transition: `transform ${EASE}` }}
      >
        <div
          className="flex h-5 shrink-0 cursor-grab touch-none items-center justify-center"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden
        >
          <span className="h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </div>
        {open ? children : lastChildren.current}
      </div>
    </div>,
    document.body,
  );
}
