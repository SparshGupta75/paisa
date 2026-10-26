import { CalendarDays, Delete, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { db, newId, type Txn } from '../../db';
import { useCategories } from '../../hooks';
import { addDays, dayLabel } from '../../lib/dates';
import { formatINR, parseAmount } from '../../lib/money';
import { quickParse } from '../../lib/quickParse';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;

/** Appends a keypad key to the amount text, keeping it a valid rupee amount. */
function pressKey(text: string, key: (typeof KEYS)[number]): string {
  if (key === 'del') return text.slice(0, -1);
  if (key === '.') return text.includes('.') ? text : `${text || '0'}.`;
  if (text.includes('.') && text.split('.')[1]!.length >= 2) return text;
  if (!text.includes('.') && text.replace(/^0+/, '').length >= 8) return text;
  return text === '0' ? key : text + key;
}

/** Adds a new expense, or edits `editing` when given. */
export function AddSheet({
  open,
  onClose,
  today,
  editing = null,
}: {
  open: boolean;
  onClose: () => void;
  today: string;
  editing?: Txn | null;
}) {
  const categories = useCategories();
  const toast = useToast();
  const [quick, setQuick] = useState('');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [pickedCategory, setPickedCategory] = useState(false);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const dateInput = useRef<HTMLInputElement>(null);
  // What quick add last filled in, so it can clear its own values without
  // touching anything picked by hand.
  const fromQuick = useRef<{ amount: string | null; date: string | null; note: string }>({ amount: null, date: null, note: '' });
  const saving = useRef(false);

  useEffect(() => {
    if (!open) return;
    setQuick('');
    setAmountText(editing ? String(editing.amount / 100) : '');
    setCategoryId(editing?.categoryId ?? null);
    setPickedCategory(!!editing);
    setDate(editing?.date ?? today);
    setNote(editing?.note ?? '');
    fromQuick.current = { amount: null, date: null, note: '' };
    saving.current = false;
  }, [open, today, editing]);

  const amount = parseAmount(amountText);

  const onQuick = (text: string) => {
    setQuick(text);
    const parsed = quickParse(text, today);
    const previous = fromQuick.current;

    const amount = parsed.amount === null ? null : String(parsed.amount / 100);
    if (amount !== null) setAmountText(amount);
    else if (previous.amount !== null) setAmountText((current) => (current === previous.amount ? '' : current));

    if (parsed.date) setDate(parsed.date);
    else if (previous.date) setDate((current) => (current === previous.date ? today : current));

    setNote((current) => (current === previous.note ? parsed.note : current));
    fromQuick.current = { amount, date: parsed.date, note: parsed.note };
    if (!pickedCategory) setCategoryId(parsed.categoryId);
  };

  const save = async () => {
    if (amount === null || saving.current) return;
    saving.current = true;
    const category = categories.find((c) => c.id === categoryId) ?? categories.find((c) => c.id === 'other');
    const now = Date.now();
    const fields = { amount, date, categoryId: category?.id ?? 'other', note: note.trim(), updatedAt: now };
    if (editing) {
      await db.txns.update(editing.id, fields);
      onClose();
      toast('Saved');
      return;
    }
    await db.txns.add({ id: newId(), createdAt: now, ...fields });
    onClose();
    toast(`Added ${formatINR(amount)} · ${category?.name ?? 'Other'}`);
  };

  const remove = async () => {
    if (!editing || saving.current) return;
    saving.current = true;
    const deleted = editing;
    await db.txns.delete(deleted.id);
    onClose();
    toast(`Deleted ${formatINR(deleted.amount)}`, { label: 'Undo', onPress: () => void db.txns.put(deleted) });
  };

  const dateChip = (value: string, label: string) => (
    <button
      onClick={() => setDate(value)}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ${
        date === value ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-200/70 dark:bg-zinc-800'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Sheet open={open} onClose={onClose} label={editing ? 'Edit expense' : 'Add expense'}>
      <div className="flex items-center justify-between px-5 pt-4">
        <button onClick={onClose} className="w-16 text-left text-zinc-500">
          Cancel
        </button>
        <span className="font-semibold">{editing ? 'Edit expense' : 'New expense'}</span>
        {editing ? (
          <button onClick={() => void remove()} aria-label="Delete expense" className="flex w-16 justify-end text-red-500">
            <Trash2 size={20} />
          </button>
        ) : (
          <span className="w-16" />
        )}
      </div>

      <div className="no-scrollbar overflow-y-auto">
        {editing ? null : (
        <label className="mx-5 mt-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 dark:bg-zinc-800">
          <Sparkles size={18} className="shrink-0 text-emerald-500" />
          <input
            value={quick}
            onChange={(event) => onQuick(event.target.value)}
            placeholder="Type it: chai 40 yesterday"
            aria-label="Quick add"
            enterKeyHint="done"
            onKeyDown={(event) => event.key === 'Enter' && void save()}
            className="w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
          />
        </label>
        )}

        <div className="tabular mt-4 text-center text-6xl font-semibold tracking-tight" aria-label="Amount">
          <span className="text-zinc-400">₹</span>
          {amountText || <span className="text-zinc-300 dark:text-zinc-600">0</span>}
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setCategoryId(category.id);
                setPickedCategory(true);
              }}
              aria-pressed={categoryId === category.id}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                categoryId === category.id
                  ? 'border-transparent text-white'
                  : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
              }`}
              style={categoryId === category.id ? { backgroundColor: category.color } : undefined}
            >
              <span>{category.emoji}</span>
              {category.name}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 px-5">
          {dateChip(today, 'Today')}
          {dateChip(addDays(today, -1), 'Yesterday')}
          <button
            className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
              date !== today && date !== addDays(today, -1)
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-zinc-200/70 dark:bg-zinc-800'
            }`}
          >
            <CalendarDays size={15} />
            {date !== today && date !== addDays(today, -1) ? dayLabel(date, today) : 'Pick date'}
            <input
              ref={dateInput}
              type="date"
              aria-label="Date"
              max={today}
              value={date}
              onChange={(event) => event.target.value && setDate(event.target.value)}
              className="absolute inset-0 opacity-0"
            />
          </button>
        </div>

        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Note (optional)"
          aria-label="Note"
          className="mx-5 mt-3 w-[calc(100%-2.5rem)] rounded-2xl bg-white px-4 py-3 text-base outline-none placeholder:text-zinc-400 dark:bg-zinc-800"
        />

        <div className="mt-3 grid grid-cols-3 gap-1 px-3">
          {KEYS.map((key) => (
            <button
              key={key}
              aria-label={key === 'del' ? 'Delete digit' : key}
              onClick={() => setAmountText((text) => pressKey(text, key))}
              className="tabular flex h-12 items-center justify-center rounded-2xl text-2xl font-medium active:bg-zinc-200 dark:active:bg-zinc-800"
            >
              {key === 'del' ? <Delete size={24} /> : key}
            </button>
          ))}
        </div>

        <div className="px-5 pt-2 pb-4">
          <button
            disabled={amount === null}
            onClick={() => void save()}
            className="h-14 w-full rounded-2xl bg-emerald-500 text-lg font-semibold text-white disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
          >
            {amount === null ? 'Enter an amount' : editing ? 'Save' : `Add ${formatINR(amount)}`}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
