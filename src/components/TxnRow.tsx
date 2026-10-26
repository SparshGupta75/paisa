import type { Category, Txn } from '../db';
import { formatINR } from '../lib/money';

export function TxnRow({ txn, category, onPress }: { txn: Txn; category?: Category; onPress?: () => void }) {
  const title = txn.note || category?.name || 'Expense';
  return (
    <button onClick={onPress} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-zinc-100 dark:active:bg-zinc-800">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ backgroundColor: `${category?.color ?? '#71717a'}22` }}
        aria-hidden
      >
        {category?.emoji ?? '📦'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {txn.note && category ? <span className="block text-sm text-zinc-500">{category.name}</span> : null}
      </span>
      <span className="tabular font-semibold">{formatINR(txn.amount)}</span>
    </button>
  );
}
