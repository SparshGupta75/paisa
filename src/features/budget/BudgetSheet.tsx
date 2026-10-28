import { useEffect, useState } from 'react';

import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { setSetting } from '../../db';
import { saveErrorMessage } from '../../lib/errors';
import { formatINR, parseAmount } from '../../lib/money';

/** Sets (or clears) a monthly budget stored under `settingKey`. */
export function BudgetSheet({
  open,
  onClose,
  title,
  settingKey,
  current,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  settingKey: string;
  current: number | null;
}) {
  const toast = useToast();
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) setText(current ? String(current / 100) : '');
  }, [open, current]);

  const amount = parseAmount(text);

  const save = async (value: number | null) => {
    const before = current;
    try {
      await setSetting(settingKey, value);
    } catch (error) {
      toast(saveErrorMessage(error), { error: true });
      return;
    }
    onClose();
    toast(value ? `Budget set to ${formatINR(value)} a month` : 'Budget removed', {
      label: 'Undo',
      onPress: () => void setSetting(settingKey, before),
    });
  };

  return (
    <Sheet open={open} onClose={onClose} label={title}>
      <div className="flex items-center justify-between px-5 pt-4">
        <button onClick={onClose} className="w-16 text-left text-zinc-500">
          Cancel
        </button>
        <span className="font-semibold">{title}</span>
        <span className="w-16" />
      </div>
      <div className="px-5 pt-6 pb-6">
        <label className="flex items-center rounded-2xl bg-white px-4 py-4 text-3xl font-semibold dark:bg-zinc-800">
          <span className="text-zinc-400">₹</span>
          <input
            autoFocus
            inputMode="decimal"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && amount !== null && void save(amount)}
            placeholder="30,000"
            aria-label="Budget amount"
            className="tabular ml-1 w-full bg-transparent outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
          />
        </label>
        <p className="mt-2 px-1 text-sm text-zinc-500">Per month. Paisa works out what’s safe to spend each day.</p>
        <button
          disabled={amount === null}
          onClick={() => amount !== null && void save(amount)}
          className="mt-6 h-14 w-full rounded-2xl bg-emerald-500 text-lg font-semibold text-white disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
        >
          Save budget
        </button>
        {current ? (
          <button onClick={() => void save(null)} className="mt-3 h-12 w-full rounded-2xl font-medium text-red-500">
            Remove budget
          </button>
        ) : null}
      </div>
    </Sheet>
  );
}
