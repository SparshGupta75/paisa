import { useState } from 'react';

import { Empty, Screen } from './components/Screen';
import { TabBar, type Tab } from './components/TabBar';
import { ToastProvider } from './components/Toast';
import { Activity } from './features/activity/Activity';
import { AddSheet } from './features/add/AddSheet';
import { Home } from './features/home/Home';
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

  return (
    <ToastProvider>
      {tab === 'home' ? <Home today={today} onEdit={setEditing} /> : null}
      {tab === 'activity' ? <Activity today={today} onEdit={setEditing} query={query} setQuery={setQuery} /> : null}
      {tab === 'insights' ? (
        <Screen title="Insights">
          <Empty emoji="📊" title="Coming soon" message="Trends and breakdowns appear here." />
        </Screen>
      ) : null}
      {tab === 'settings' ? <Settings /> : null}
      <TabBar tab={tab} onTab={setTab} onAdd={() => setAdding(true)} />
      <AddSheet open={adding || editing !== null} onClose={close} today={today} editing={editing} />
    </ToastProvider>
  );
}
