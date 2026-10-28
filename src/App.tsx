import { useLayoutEffect, useRef, useState } from 'react';

import { TabBar, type Tab } from './components/TabBar';
import { FeedbackProvider } from './components/Feedback';
import { PwaUpdates } from './components/Pwa';
import { ToastProvider } from './components/Toast';
import { Activity } from './features/activity/Activity';
import { AddSheet } from './features/add/AddSheet';
import { Home } from './features/home/Home';
import { Insights } from './features/insights/Insights';
import { Settings } from './features/settings/Settings';
import type { Txn } from './db';
import { useToday } from './hooks';

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Txn | null>(null);
  const [query, setQuery] = useState('');
  const close = () => {
    setAdding(false);
    setEditing(null);
  };
  const today = useToday();
  // Every tab stays mounted (no reload or blank flash when switching back) and keeps its own scroll position.
  const scrollFor = useRef<Partial<Record<Tab, number>>>({});

  const switchTab = (next: Tab) => {
    if (next === tab) {
      // Tapping the current tab scrolls it to the top, as on iOS.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    scrollFor.current[tab] = window.scrollY;
    setTab(next);
  };

  useLayoutEffect(() => {
    window.scrollTo(0, scrollFor.current[tab] ?? 0);
  }, [tab]);

  const pane = (id: Tab, content: React.ReactNode) => (
    <div hidden={tab !== id} className={tab === id ? 'tab-enter' : undefined}>
      {content}
    </div>
  );

  return (
    <FeedbackProvider goTo={switchTab}>
    <ToastProvider>
      <PwaUpdates />
      {pane('home', <Home today={today} onEdit={setEditing} onAdd={() => setAdding(true)} />)}
      {pane('activity', <Activity today={today} onEdit={setEditing} query={query} setQuery={setQuery} />)}
      {pane('insights', <Insights today={today} />)}
      {pane('settings', <Settings today={today} />)}
      <TabBar tab={tab} onTab={switchTab} onAdd={() => setAdding(true)} />
      <AddSheet open={adding || editing !== null} onClose={close} today={today} editing={editing} />
    </ToastProvider>
    </FeedbackProvider>
  );
}
