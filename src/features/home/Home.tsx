import { Card, Empty, Screen } from '../../components/Screen';
import { TxnRow } from '../../components/TxnRow';
import { useCategoryMap } from '../../hooks';
import { fromISODate, monthKey } from '../../lib/dates';
import { formatINR } from '../../lib/money';
import { useAllTxns } from '../activity/Activity';

export function Home({ today }: { today: string }) {
  const txns = useAllTxns();
  const categories = useCategoryMap();
  if (txns === undefined) return <Screen title="Paisa">{null}</Screen>;

  const month = txns.filter((txn) => monthKey(txn.date) === monthKey(today));
  const spent = month.reduce((sum, txn) => sum + txn.amount, 0);
  const monthName = fromISODate(today).toLocaleDateString('en-IN', { month: 'long' });

  return (
    <Screen title="Paisa">
      <Card className="p-5">
        <p className="text-sm font-medium text-zinc-500">Spent in {monthName}</p>
        <p className="tabular mt-1 text-4xl font-bold tracking-tight">{formatINR(spent)}</p>
        <p className="mt-1 text-sm text-zinc-500">
          {month.length} {month.length === 1 ? 'expense' : 'expenses'}
        </p>
      </Card>

      <h2 className="mt-6 mb-1.5 px-1 text-sm font-medium text-zinc-500">Recent</h2>
      {txns.length === 0 ? (
        <Card>
          <Empty emoji="👋" title="Welcome to Paisa" message="Tap + and type “chai 40”. That’s it." />
        </Card>
      ) : (
        <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {txns.slice(0, 5).map((txn) => (
            <TxnRow key={txn.id} txn={txn} category={categories.get(txn.categoryId)} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
