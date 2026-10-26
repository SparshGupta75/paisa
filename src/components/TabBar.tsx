import { House, List, PieChart, Plus, Settings } from 'lucide-react';

export type Tab = 'home' | 'activity' | 'insights' | 'settings';

const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: 'home', label: 'Home', Icon: House },
  { id: 'activity', label: 'Activity', Icon: List },
  { id: 'insights', label: 'Insights', Icon: PieChart },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export function TabBar({ tab, onTab, onAdd }: { tab: Tab; onTab: (tab: Tab) => void; onAdd: () => void }) {
  const button = ({ id, label, Icon }: (typeof TABS)[number]) => (
    <button
      key={id}
      role="tab"
      aria-selected={tab === id}
      onClick={() => onTab(id)}
      className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-medium ${
        tab === id ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
      }`}
    >
      <Icon size={22} strokeWidth={tab === id ? 2.4 : 2} />
      {label}
    </button>
  );

  return (
    <nav
      role="tablist"
      className="fixed inset-x-0 bottom-0 z-30 flex items-start border-t border-zinc-200/80 bg-white/85 pb-[max(env(safe-area-inset-bottom),8px)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/85"
    >
      {TABS.slice(0, 2).map(button)}
      <div className="flex flex-1 justify-center">
        <button
          aria-label="Add expense"
          onClick={onAdd}
          className="-mt-5 flex size-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 active:scale-95"
        >
          <Plus size={28} strokeWidth={2.6} />
        </button>
      </div>
      {TABS.slice(2).map(button)}
    </nav>
  );
}
