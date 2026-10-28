import { useLiveQuery } from 'dexie-react-hooks';
import { Search, X } from 'lucide-react';

import { Card, Empty, Screen } from '../../components/Screen';
import { TxnRow } from '../../components/TxnRow';
import { db, type Txn } from '../../db';
import { useCategoryMap } from '../../hooks';
import { dayLabel } from '../../lib/dates';
import { formatINR } from '../../lib/money';
import { matchesSearch } from '../../lib/search';
import { receivedOf, spentOf } from '../../lib/totals';

/** "₹1,100 · +₹200": what you spent, and money in when there was any. */
function Totals({ txns }: { txns: Txn[] }) {
  const received = receivedOf(txns);
  return (
    <span className="tabular">
      {formatINR(spentOf(txns))}
      {received ? <span className="text-emerald-600 dark:text-emerald-400"> · +{formatINR(received)}</span> : null}
    </span>
  );
}

/** Newest day first; within a day, newest entry first. */
export function useAllTxns(): Txn[] | undefined {
  return useLiveQuery(async () => {
    const txns = await db.txns.toArray();
    return txns.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, []);
}

export function Activity({
  today,
  onEdit,
  query,
  setQuery,
}: {
  today: string;
  onEdit: (txn: Txn) => void;
  /** Kept by the app so it survives switching tabs. */
  query: string;
  setQuery: (query: string) => void;
}) {
  const allTxns = useAllTxns();
  const categories = useCategoryMap();

  if (allTxns === undefined) return <Screen title="Activity">{null}</Screen>;

  const txns = query.trim()
    ? allTxns.filter((txn) => matchesSearch(txn, categories.get(txn.categoryId)?.name ?? '', query))
    : allTxns;
  const days = new Map<string, Txn[]>();
  for (const txn of txns) days.set(txn.date, [...(days.get(txn.date) ?? []), txn]);

  return (
    <Screen title="Activity">
      {allTxns.length > 0 ? (
        <label className="mb-4 flex items-center gap-2 rounded-xl bg-zinc-200/70 px-3 py-2 dark:bg-zinc-800">
          <Search size={17} className="shrink-0 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes, categories, amounts"
            aria-label="Search"
            className="w-full bg-transparent text-base outline-none placeholder:text-zinc-400 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button aria-label="Clear search" onClick={() => setQuery('')} className="text-zinc-400">
              <X size={17} />
            </button>
          ) : null}
        </label>
      ) : null}
      {query.trim() && txns.length > 0 ? (
        <p className="mb-3 px-1 text-sm text-zinc-500">
          {txns.length} {txns.length === 1 ? 'result' : 'results'} ·{' '}
          <Totals txns={txns} />
        </p>
      ) : null}
      {allTxns.length === 0 ? (
        <Empty emoji="🧾" title="Nothing here yet" message="Tap + to add an expense or money in. Try typing “chai 40”." />
      ) : txns.length === 0 ? (
        <Empty
          emoji="🔍"
          title="No matches"
          message={`Nothing found for “${query.trim()}”. Search looks at notes, categories and amounts.`}
          actions={[{ label: 'Clear search', onPress: () => setQuery('') }]}
        />
      ) : (
        <div className="space-y-5">
          {[...days].map(([date, dayTxns]) => (
            <div key={date}>
              <div className="mb-1.5 flex justify-between px-1 text-sm font-medium text-zinc-500">
                <span>{dayLabel(date, today)}</span>
                <Totals txns={dayTxns} />
              </div>
              <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {dayTxns.map((txn) => (
                  <TxnRow key={txn.id} txn={txn} category={categories.get(txn.categoryId)} onPress={() => onEdit(txn)} />
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}
