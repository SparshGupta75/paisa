import { useLiveQuery } from 'dexie-react-hooks';

import { Card, Empty, Screen } from '../../components/Screen';
import { TxnRow } from '../../components/TxnRow';
import { db, type Txn } from '../../db';
import { useCategoryMap } from '../../hooks';
import { dayLabel } from '../../lib/dates';
import { formatINR } from '../../lib/money';

/** Newest day first; within a day, newest entry first. */
export function useAllTxns(): Txn[] | undefined {
  return useLiveQuery(async () => {
    const txns = await db.txns.toArray();
    return txns.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, []);
}

export function Activity({ today }: { today: string }) {
  const txns = useAllTxns();
  const categories = useCategoryMap();

  if (txns === undefined) return <Screen title="Activity">{null}</Screen>;

  const days = new Map<string, Txn[]>();
  for (const txn of txns) days.set(txn.date, [...(days.get(txn.date) ?? []), txn]);

  return (
    <Screen title="Activity">
      {txns.length === 0 ? (
        <Empty emoji="🧾" title="No expenses yet" message="Tap + to add your first one. Try typing “chai 40”." />
      ) : (
        <div className="space-y-5">
          {[...days].map(([date, dayTxns]) => (
            <div key={date}>
              <div className="mb-1.5 flex justify-between px-1 text-sm font-medium text-zinc-500">
                <span>{dayLabel(date, today)}</span>
                <span className="tabular">{formatINR(dayTxns.reduce((sum, t) => sum + t.amount, 0))}</span>
              </div>
              <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {dayTxns.map((txn) => (
                  <TxnRow key={txn.id} txn={txn} category={categories.get(txn.categoryId)} />
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}
