import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import type { Tab } from './TabBar';

interface Feedback {
  /** Rows to highlight because they just changed. */
  flashed: Set<string>;
  /** Highlight these rows for a moment, so you can see what just happened. */
  flash: (ids: string[]) => void;
  /** Switch tabs, e.g. from a toast's "View" button. */
  goTo: (tab: Tab) => void;
}

const FeedbackContext = createContext<Feedback>({ flashed: new Set(), flash: () => {}, goTo: () => {} });

export function useFeedback() {
  return useContext(FeedbackContext);
}

export function FeedbackProvider({ goTo, children }: { goTo: (tab: Tab) => void; children: ReactNode }) {
  const [flashed, setFlashed] = useState<Set<string>>(new Set());
  const timer = useRef<number | undefined>(undefined);
  const flash = useCallback((ids: string[]) => {
    window.clearTimeout(timer.current);
    setFlashed(new Set(ids));
    timer.current = window.setTimeout(() => setFlashed(new Set()), 1800);
  }, []);
  return <FeedbackContext.Provider value={{ flashed, flash, goTo }}>{children}</FeedbackContext.Provider>;
}
