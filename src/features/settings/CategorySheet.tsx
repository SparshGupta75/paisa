import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';

import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { FALLBACK, db, deleteCategory, newId, type Category } from '../../db';
import { firstGrapheme } from '../../lib/emoji';
import { parseAmount } from '../../lib/money';

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#ec4899', '#eab308', '#8b5cf6', '#ef4444', '#06b6d4', '#6366f1', '#71717a'];

/** Adds a category, or edits `category` when given. */
export function CategorySheet({
  open,
  onClose,
  category,
  kind,
  nextOrder,
}: {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  /** Which side a new category goes on. */
  kind: 'expense' | 'income';
  nextOrder: number;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState(COLORS[0]!);
  const [budgetText, setBudgetText] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const usage = useLiveQuery(
    () => (category ? db.txns.where('categoryId').equals(category.id).count() : 0),
    [category?.id],
  );

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setEmoji(category?.emoji ?? '');
    setColor(category?.color ?? COLORS[0]!);
    setBudgetText(category?.budget ? String(category.budget / 100) : '');
    setConfirmingDelete(false);
  }, [open, category]);

  const budget = budgetText.trim() ? parseAmount(budgetText) : null;
  const budgetInvalid = budgetText.trim() !== '' && budget === null;
  const canSave = name.trim() !== '' && !budgetInvalid;

  const save = async () => {
    if (!canSave) return;
    const fields = { name: name.trim(), emoji: emoji || '🏷️', color, budget: kind === 'income' ? null : budget };
    if (category) await db.categories.update(category.id, fields);
    else await db.categories.add({ id: newId(), order: nextOrder, ...fields, ...(kind === 'income' ? { kind } : {}) });
    onClose();
    toast(category ? 'Category saved' : `Added ${fields.emoji} ${fields.name}`);
  };

  const remove = async () => {
    if (!category) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await deleteCategory(category.id);
    onClose();
    toast(`Deleted ${category.name}; its expenses moved to Other`);
  };

  return (
    <Sheet open={open} onClose={onClose} label={category ? 'Edit category' : 'New category'}>
      <div className="flex items-center justify-between px-5 pt-4">
        <button onClick={onClose} className="w-16 text-left text-zinc-500">
          Cancel
        </button>
        <span className="font-semibold">{category ? 'Edit category' : 'New category'}</span>
        <button onClick={() => void save()} disabled={!canSave} className="w-16 text-right font-semibold text-emerald-600 disabled:text-zinc-400">
          Save
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto px-5 pt-5 pb-6">
        <div className="flex gap-3">
          <input
            value={emoji}
            onChange={(event) => setEmoji(firstGrapheme(event.target.value))}
            placeholder="🏷️"
            aria-label="Emoji"
            className="size-14 shrink-0 rounded-2xl text-center text-3xl outline-none"
            style={{ backgroundColor: `${color}22` }}
          />
          <input
            autoFocus={!category}
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 30))}
            placeholder="Name"
            aria-label="Category name"
            className="h-14 w-full rounded-2xl bg-white px-4 text-lg outline-none dark:bg-zinc-800"
          />
        </div>

        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Colour">
          {COLORS.map((swatch) => (
            <button
              key={swatch}
              role="radio"
              aria-checked={color === swatch}
              aria-label={`Colour ${swatch}`}
              onClick={() => setColor(swatch)}
              className={`size-9 rounded-full ${color === swatch ? 'ring-2 ring-zinc-900 ring-offset-2 dark:ring-white dark:ring-offset-zinc-900' : ''}`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>

        {kind === 'income' ? null : (
        <label className="block">
          <span className="px-1 text-sm text-zinc-500">Monthly limit (optional)</span>
          <span className="mt-1 flex items-center rounded-2xl bg-white px-4 py-3 dark:bg-zinc-800">
            <span className="text-zinc-400">₹</span>
            <input
              inputMode="decimal"
              value={budgetText}
              onChange={(event) => setBudgetText(event.target.value)}
              placeholder="No limit"
              aria-label="Monthly limit"
              className="tabular ml-1 w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
            />
          </span>
          {budgetInvalid ? <span className="mt-1 block px-1 text-sm text-red-500">Enter an amount like 2000</span> : null}
        </label>
        )}

        {category && category.id !== FALLBACK.expense && category.id !== FALLBACK.income ? (
          <button onClick={() => void remove()} className="h-12 w-full rounded-2xl bg-red-500/10 font-medium text-red-500">
            {confirmingDelete
              ? usage
                ? `Tap again · ${usage} ${usage === 1 ? 'entry moves' : 'entries move'} to ${kind === 'income' ? 'Other income' : 'Other'}`
                : 'Tap again to delete'
              : 'Delete category'}
          </button>
        ) : null}
      </div>
    </Sheet>
  );
}
