import { useState } from 'react';

import { Empty, Screen } from './components/Screen';
import { TabBar, type Tab } from './components/TabBar';
import { ToastProvider } from './components/Toast';
import { Activity } from './features/activity/Activity';
import { AddSheet } from './features/add/AddSheet';
import { Home } from './features/home/Home';
import { useToday } from './hooks';

export function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [adding, setAdding] = useState(false);
  const today = useToday();

  return (
    <ToastProvider>
      {tab === 'home' ? <Home today={today} /> : null}
      {tab === 'activity' ? <Activity today={today} /> : null}
      {tab === 'insights' ? (
        <Screen title="Insights">
          <Empty emoji="📊" title="Coming soon" message="Trends and breakdowns appear here." />
        </Screen>
      ) : null}
      {tab === 'settings' ? (
        <Screen title="Settings">
          <Empty emoji="⚙️" title="Coming soon" message="Budgets, categories and backups live here." />
        </Screen>
      ) : null}
      <TabBar tab={tab} onTab={setTab} onAdd={() => setAdding(true)} />
      <AddSheet open={adding} onClose={() => setAdding(false)} today={today} />
    </ToastProvider>
  );
}
