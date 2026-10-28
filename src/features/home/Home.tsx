import { ChevronRight, LifeBuoy } from 'lucide-react';
import { useState } from 'react';

import { Card, Empty, Screen } from '../../components/Screen';
import { TxnRow } from '../../components/TxnRow';
import type { Txn } from '../../db';
import { useCategoryMap, useSetting } from '../../hooks';
import { budgetStatus } from '../../lib/budget';
import { fromISODate, monthKey } from '../../lib/dates';
import { formatINR } from '../../lib/money';
import { receivedOf, spentOf } from '../../lib/totals';
import { useAllTxns } from '../activity/Activity';
import { BudgetSheet } from '../budget/BudgetSheet';
import { useFeedback } from '../../components/Feedback';
import { InstallHint } from '../../components/Pwa';
import { useToast } from '../../components/Toast';
import { backUp } from '../settings/backupActions';
import { lastBackupLabel } from '../settings/DataSection';

const BACKUP_NUDGE_DAYS = 14;

/** "1 Nov": when this month's budget starts over. */
function resetDate(today: string): string {
  const date = fromISODate(today);
  return new Date(date.getFullYear(), date.getMonth() + 1, 1).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function Home({ today, onEdit, onAdd }: { today: string; onEdit: (txn: Txn) => void; onAdd: () => void }) {
  const { goTo } = useFeedback();
  const txns = useAllTxns();
  const categories = useCategoryMap();
  const budget = useSetting<number | null>('monthlyBudget', null);
  const [editingBudget, setEditingBudget] = useState(false);
  const lastBackupAt = useSetting<number | null>('lastBackupAt', null);
  const toast = useToast();
  if (txns === undefined) return <Screen title="Paisa">{null}</Screen>;

  const month = txns.filter((txn) => monthKey(txn.date) === monthKey(today));
  // Spending is expenses at your share; money in is shown on its own and never raises the budget.
  const spent = spentOf(month);
  const spentToday = spentOf(month.filter((txn) => txn.date === today));
  const received = receivedOf(month);
  const dayOfMonth = fromISODate(today).getDate();
  const monthName = fromISODate(today).toLocaleDateString('en-IN', { month: 'long' });
  const status = budget ? budgetStatus({ budget, spentThisMonth: spent, spentToday, today }) : null;

  const byCategory = new Map<string, number>();
  for (const txn of month) {
    if (txn.type !== 'income') byCategory.set(txn.categoryId, (byCategory.get(txn.categoryId) ?? 0) + (txn.share ?? txn.amount));
  }
  const top = [...byCategory].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const largest = top[0]?.[1] ?? 1;

  const barColor = !status ? '' : status.used > 1 ? 'bg-red-500' : status.used > 0.8 ? 'bg-amber-500' : 'bg-emerald-500';

  // First run: one clear next step, nothing else competing for attention.
  if (txns.length === 0) {
    return (
      <Screen title="Paisa">
        <Card>
          <Empty
            emoji="👋"
            title="Welcome to Paisa"
            message="Add what you spend in a couple of taps (try “chai 40”), or bring in a month at once from your bank statement."
            actions={[
              { label: 'Add an expense', onPress: onAdd, primary: true },
              { label: 'Import a bank statement', onPress: () => goTo('settings') },
            ]}
          />
        </Card>
        <div className="mt-3">
          <InstallHint />
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Paisa">
      <InstallHint />
      {status && budget ? (
        <Card className="p-5">
          <p className="text-sm font-medium text-zinc-500">Safe to spend today</p>
          <p
            className={`tabular mt-1 text-5xl font-bold tracking-tight ${status.remaining < 0 ? 'text-red-500' : ''}`}
            aria-label="Safe to spend today"
          >
            {formatINR(status.leftToday)}
          </p>
          {spentToday > 0 && status.perDay > 0 ? (
            <p className="tabular text-sm text-zinc-500">
              {formatINR(Math.min(spentToday, status.perDay))} of today’s {formatINR(status.perDay)} used
            </p>
          ) : null}
          <p className="mt-1 text-sm text-zinc-500">
            {status.remaining >= 0
              ? `${formatINR(status.remaining)} left · resets ${resetDate(today)} (${status.daysLeft} ${status.daysLeft === 1 ? 'day' : 'days'})`
              : `${formatINR(-status.remaining)} over budget · resets ${resetDate(today)}`}
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

      {txns.length > 0 && (!lastBackupAt || Date.now() - lastBackupAt > BACKUP_NUDGE_DAYS * 86_400_000) ? (
        <button
          onClick={async () => {
            if (await backUp()) toast('Backup saved');
          }}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-left"
        >
          <LifeBuoy size={20} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="flex-1 text-sm">
            <span className="block font-semibold">Back up your expenses</span>
            <span className="text-zinc-500">{lastBackupLabel(lastBackupAt)}</span>
          </span>
          <ChevronRight size={18} className="text-zinc-400" />
        </button>
      ) : null}

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

      {received > 0 ? (
        <Card className="mt-3 flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-zinc-500">Money in</p>
            <p className="tabular mt-0.5 text-xl font-semibold text-emerald-600 dark:text-emerald-400">+{formatINR(received)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-500">Net this month</p>
            <p className={`tabular mt-0.5 text-xl font-semibold ${received - spent < 0 ? '' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {received - spent < 0 ? '−' : '+'}
              {formatINR(Math.abs(received - spent))}
            </p>
          </div>
        </Card>
      ) : null}

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
                  {limit ? (
                    <p className={`tabular mt-1 text-xs ${over ? 'text-red-500' : 'text-zinc-500'}`}>
                      {over ? `${formatINR(amount - limit)} over this month’s limit` : `${formatINR(limit - amount)} left this month`}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </Card>
        </>
      ) : null}

      <h2 className="mt-6 mb-1.5 px-1 text-sm font-medium text-zinc-500">Recent</h2>
      {txns.length === 0 ? (
        <Card>
          <Empty
            emoji="👋"
            title="Welcome to Paisa"
            message="Add what you spend in a couple of taps (try “chai 40”), or bring in a month at once from your bank statement."
            actions={[
              { label: 'Add an expense', onPress: onAdd, primary: true },
              { label: 'Import a bank statement', onPress: () => goTo('settings') },
            ]}
          />
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
