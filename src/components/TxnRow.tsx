import type { Category, Txn } from '../db';
import { formatINR } from '../lib/money';
import { useFeedback } from './Feedback';

export function TxnRow({ txn, category, onPress }: { txn: Txn; category?: Category; onPress?: () => void }) {
  const income = txn.type === 'income';
  const justChanged = useFeedback().flashed.has(txn.id);
  const title = txn.note || category?.name || (income ? 'Money in' : 'Expense');
  const details = [txn.note && category ? category.name : null, txn.share ? `Split · your share ${formatINR(txn.share)}` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <button
      onClick={onPress}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 active:bg-zinc-100 dark:active:bg-zinc-800 ${justChanged ? 'row-flash' : ''}`}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ backgroundColor: `${category?.color ?? '#71717a'}22` }}
        aria-hidden
      >
        {category?.emoji ?? (income ? '💰' : '📦')}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        {details ? <span className="block truncate text-sm text-zinc-500">{details}</span> : null}
      </span>
      <span className={`tabular font-semibold ${income ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
        {income ? '+' : ''}
        {formatINR(txn.amount)}
      </span>
    </button>
  );
}
