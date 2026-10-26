import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { Card, Empty, Screen } from '../../components/Screen';
import { TxnRow } from '../../components/TxnRow';
import type { Txn } from '../../db';
import { useCategoryMap, useSetting } from '../../hooks';
import { budgetStatus } from '../../lib/budget';
import { fromISODate, monthKey } from '../../lib/dates';
import { formatINR } from '../../lib/money';
import { useAllTxns } from '../activity/Activity';
import { BudgetSheet } from '../budget/BudgetSheet';

export function Home({ today, onEdit }: { today: string; onEdit: (txn: Txn) => void }) {
  const txns = useAllTxns();
  const categories = useCategoryMap();
  const budget = useSetting<number | null>('monthlyBudget', null);
  const [editingBudget, setEditingBudget] = useState(false);
  if (txns === undefined) return <Screen title="Paisa">{null}</Screen>;

  const month = txns.filter((txn) => monthKey(txn.date) === monthKey(today));
  const spent = month.reduce((sum, txn) => sum + txn.amount, 0);
  const spentToday = month.filter((txn) => txn.date === today).reduce((sum, txn) => sum + txn.amount, 0);
  const dayOfMonth = fromISODate(today).getDate();
  const monthName = fromISODate(today).toLocaleDateString('en-IN', { month: 'long' });
  const status = budget ? budgetStatus({ budget, spentThisMonth: spent, spentToday, today }) : null;

  const byCategory = new Map<string, number>();
  for (const txn of month) byCategory.set(txn.categoryId, (byCategory.get(txn.categoryId) ?? 0) + txn.amount);
  const top = [...byCategory].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const largest = top[0]?.[1] ?? 1;

  const barColor = !status ? '' : status.used > 1 ? 'bg-red-500' : status.used > 0.8 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <Screen title="Paisa">
      {status && budget ? (
        <Card className="p-5">
          <p className="text-sm font-medium text-zinc-500">Safe to spend today</p>
          <p
            className={`tabular mt-1 text-5xl font-bold tracking-tight ${status.remaining < 0 ? 'text-red-500' : ''}`}
            aria-label="Safe to spend today"
          >
            {formatINR(status.leftToday)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {status.remaining >= 0
              ? `${formatINR(status.remaining)} left · ${status.daysLeft} ${status.daysLeft === 1 ? 'day' : 'days'} to go`
              : `${formatINR(-status.remaining)} over budget`}
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, status.used * 100)}%` }} />
          </div>
          <button
            onClick={() => setEditingBudget(true)}
            className="mt-2 flex w-full justify-between text-sm text-zinc-500"
            aria-label="Edit monthly budget"
          >
            <span className="tabular">
              {formatINR(spent)} of {formatINR(budget)} in {monthName}
            </span>
            <ChevronRight size={16} />
          </button>
        </Card>
      ) : (
        <Card className="p-5">
          <p className="text-sm font-medium text-zinc-500">Spent in {monthName}</p>
          <p className="tabular mt-1 text-5xl font-bold tracking-tight">{formatINR(spent)}</p>
          <button
            onClick={() => setEditingBudget(true)}
            className="mt-4 h-11 w-full rounded-xl bg-emerald-500/10 font-semibold text-emerald-600 dark:text-emerald-400"
          >
            Set a monthly budget
          </button>
        </Card>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-sm text-zinc-500">Today</p>
          <p className="tabular mt-0.5 text-xl font-semibold">{formatINR(spentToday)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-zinc-500">Daily average</p>
          <p className="tabular mt-0.5 text-xl font-semibold">{formatINR(Math.round(spent / dayOfMonth))}</p>
        </Card>
      </div>

      {top.length > 0 ? (
        <>
          <h2 className="mt-6 mb-1.5 px-1 text-sm font-medium text-zinc-500">Top categories</h2>
          <Card className="space-y-3 p-4">
            {top.map(([id, amount]) => {
              const category = categories.get(id);
              const limit = category?.budget ?? null;
              const over = limit !== null && amount > limit;
              // With a limit, the bar shows progress toward it; otherwise share of the largest category.
              const width = limit ? Math.min(100, (amount / limit) * 100) : (amount / largest) * 100;
              return (
                <div key={id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {category?.emoji} {category?.name ?? 'Other'}
                    </span>
                    <span className={`tabular font-semibold ${over ? 'text-red-500' : ''}`}>
                      {formatINR(amount)}
                      {limit ? <span className="font-normal text-zinc-500"> / {formatINR(limit)}</span> : null}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${width}%`, backgroundColor: over ? '#ef4444' : (category?.color ?? '#71717a') }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      ) : null}

      <h2 className="mt-6 mb-1.5 px-1 text-sm font-medium text-zinc-500">Recent</h2>
      {txns.length === 0 ? (
        <Card>
          <Empty emoji="👋" title="Welcome to Paisa" message="Tap + and type “chai 40”. That’s it." />
        </Card>
      ) : (
        <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {txns.slice(0, 5).map((txn) => (
            <TxnRow key={txn.id} txn={txn} category={categories.get(txn.categoryId)} onPress={() => onEdit(txn)} />
          ))}
        </Card>
      )}

      <BudgetSheet
        open={editingBudget}
        onClose={() => setEditingBudget(false)}
        title="Monthly budget"
        settingKey="monthlyBudget"
        current={budget}
      />
    </Screen>
  );
}
