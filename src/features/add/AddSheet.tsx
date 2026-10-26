import { CalendarDays, Delete, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { FALLBACK, db, isIncome, learnRule, newId, type Txn } from '../../db';
import { useCategoriesOf } from '../../hooks';
import { addDays, dayLabel } from '../../lib/dates';
import { formatINR, parseAmount } from '../../lib/money';
import { quickParse, shareOf } from '../../lib/quickParse';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;

/** Appends a keypad key to the amount text, keeping it a valid rupee amount. */
function pressKey(text: string, key: (typeof KEYS)[number]): string {
  if (key === 'del') return text.slice(0, -1);
  if (key === '.') return text.includes('.') ? text : `${text || '0'}.`;
  if (text.includes('.') && text.split('.')[1]!.length >= 2) return text;
  if (!text.includes('.') && text.replace(/^0+/, '').length >= 8) return text;
  return text === '0' ? key : text + key;
}

type Kind = 'expense' | 'income';
type Split = null | 2 | 3 | 4 | 'custom';

/** The split option that reproduces a saved share, for editing. */
function splitFor(txn: Txn): { split: Split; custom: string } {
  if (!txn.share) return { split: null, custom: '' };
  for (const ways of [2, 3, 4] as const) if (shareOf(txn.amount, ways) === txn.share) return { split: ways, custom: '' };
  return { split: 'custom', custom: String(txn.share / 100) };
}

/** Adds an expense or money in, or edits `editing` when given. */
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
  const toast = useToast();
  const [kind, setKind] = useState<Kind>('expense');
  const [pickedKind, setPickedKind] = useState(false);
  const categories = useCategoriesOf(kind);
  const [quick, setQuick] = useState('');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [pickedCategory, setPickedCategory] = useState(false);
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [split, setSplit] = useState<Split>(null);
  const [customShare, setCustomShare] = useState('');
  const dateInput = useRef<HTMLInputElement>(null);
  // What quick add last filled in, so it can clear its own values without
  // touching anything picked by hand.
  const fromQuick = useRef<{ amount: string | null; date: string | null; note: string; split: Split }>({
    amount: null,
    date: null,
    note: '',
    split: null,
  });
  const saving = useRef(false);

  useEffect(() => {
    if (!open) return;
    const editingSplit = editing ? splitFor(editing) : { split: null, custom: '' };
    setKind(editing && isIncome(editing) ? 'income' : 'expense');
    setPickedKind(!!editing);
    setQuick('');
    setAmountText(editing ? String(editing.amount / 100) : '');
    setCategoryId(editing?.categoryId ?? null);
    setPickedCategory(!!editing);
    setDate(editing?.date ?? today);
    setNote(editing?.note ?? '');
    setSplit(editingSplit.split);
    setCustomShare(editingSplit.custom);
    fromQuick.current = { amount: null, date: null, note: '', split: null };
    saving.current = false;
  }, [open, today, editing]);

  const amount = parseAmount(amountText);
  const customShareAmount = parseAmount(customShare);
  const share =
    kind === 'income' || split === null || amount === null
      ? null
      : split === 'custom'
        ? customShareAmount !== null && customShareAmount < amount
          ? customShareAmount
          : null
        : shareOf(amount, split);
  const shareInvalid = kind === 'expense' && split === 'custom' && customShare.trim() !== '' && share === null;
  const canSave = amount !== null && !shareInvalid && !(split === 'custom' && share === null && kind === 'expense');

  const switchKind = (next: Kind, byHand: boolean) => {
    if (byHand) setPickedKind(true);
    if (next === kind) return;
    setKind(next);
    // A category from the other side doesn't apply any more.
    setCategoryId(null);
    setPickedCategory(false);
    if (next === 'income') setSplit(null);
  };

  const onQuick = (text: string) => {
    setQuick(text);
    const parsed = quickParse(text, today);
    const previous = fromQuick.current;

    const amount = parsed.amount === null ? null : String(parsed.amount / 100);
    if (amount !== null) setAmountText(amount);
    else if (previous.amount !== null) setAmountText((current) => (current === previous.amount ? '' : current));

    if (parsed.date) setDate(parsed.date);
    else if (previous.date) setDate((current) => (current === previous.date ? today : current));

    const parsedSplit = (parsed.splitWays && parsed.splitWays <= 4 ? parsed.splitWays : parsed.splitWays ? 'custom' : null) as Split;
    if (parsedSplit !== previous.split) {
      setSplit(parsedSplit);
      if (parsedSplit === 'custom' && parsed.amount && parsed.splitWays) {
        setCustomShare(String(shareOf(parsed.amount, parsed.splitWays) / 100));
      }
    }

    setNote((current) => (current === previous.note ? parsed.note : current));
    fromQuick.current = { amount, date: parsed.date, note: parsed.note, split: parsedSplit };
    if (!pickedKind && parsed.type !== kind) {
      setKind(parsed.type);
      if (!pickedCategory) setCategoryId(parsed.categoryId);
      return;
    }
    if (!pickedCategory) setCategoryId(parsed.categoryId);
  };

  const save = async () => {
    if (!canSave || amount === null || saving.current) return;
    saving.current = true;
    const fallback = FALLBACK[kind];
    const category = categories.find((c) => c.id === categoryId) ?? categories.find((c) => c.id === fallback);
    const now = Date.now();
    const fields = {
      amount,
      date,
      categoryId: category?.id ?? fallback,
      note: note.trim(),
      type: kind === 'income' ? ('income' as const) : undefined,
      share: share ?? undefined,
      updatedAt: now,
    };
    if (editing) {
      await db.txns.update(editing.id, fields);
      // Re-categorising an imported entry teaches Paisa for next time.
      if (editing.merchant && fields.categoryId !== editing.categoryId) await learnRule(editing.merchant, fields.categoryId);
      onClose();
      toast('Saved');
      return;
    }
    await db.txns.add({ id: newId(), createdAt: now, ...fields });
    onClose();
    const what = kind === 'income' ? `+${formatINR(amount)}` : formatINR(amount);
    toast(share ? `Added ${what} · your share ${formatINR(share)}` : `Added ${what} · ${category?.name ?? 'Other'}`);
  };

  const remove = async () => {
    if (!editing || saving.current) return;
    saving.current = true;
    const deleted = editing;
    await db.txns.delete(deleted.id);
    onClose();
    toast(`Deleted ${formatINR(deleted.amount)}`, { label: 'Undo', onPress: () => void db.txns.put(deleted) });
  };

  const chip = (selected: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      selected ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-200/70 dark:bg-zinc-800'
    }`;

  const dateChip = (value: string, label: string) => (
    <button onClick={() => setDate(value)} className={chip(date === value)}>
      {label}
    </button>
  );

  const income = kind === 'income';
  const title = editing ? (income ? 'Edit money in' : 'Edit expense') : income ? 'Money in' : 'New expense';

  return (
    <Sheet open={open} onClose={onClose} label={editing ? title : income ? 'Add money in' : 'Add expense'}>
      <div className="flex items-center justify-between px-5 pt-4">
        <button onClick={onClose} className="w-16 text-left text-zinc-500">
          Cancel
        </button>
        <span className="font-semibold">{title}</span>
        {editing ? (
          <button
            onClick={() => void remove()}
            aria-label={income ? 'Delete entry' : 'Delete expense'}
            className="flex w-16 justify-end text-red-500"
          >
            <Trash2 size={20} />
          </button>
        ) : (
          <span className="w-16" />
        )}
      </div>

      <div className="no-scrollbar overflow-y-auto">
        <div role="radiogroup" aria-label="Type" className="mx-5 mt-2 grid grid-cols-2 rounded-xl bg-zinc-200/70 p-1 dark:bg-zinc-800">
          {(['expense', 'income'] as const).map((value) => (
            <button
              key={value}
              role="radio"
              aria-checked={kind === value}
              onClick={() => switchKind(value, true)}
              className={`rounded-lg py-1.5 text-sm font-semibold transition-all duration-200 ${
                kind === value
                  ? `bg-white shadow-sm dark:bg-zinc-700 ${value === 'income' ? 'text-emerald-600 dark:text-emerald-400' : ''}`
                  : 'text-zinc-500'
              }`}
            >
              {value === 'expense' ? 'Expense' : 'Money in'}
            </button>
          ))}
        </div>

        {editing ? null : (
          <label className="mx-5 mt-2 flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 dark:bg-zinc-800">
            <Sparkles size={18} className="shrink-0 text-emerald-500" />
            <input
              value={quick}
              onChange={(event) => onQuick(event.target.value)}
              placeholder={income ? 'Type it: got 200 from rahul' : 'Type it: chai 40, dinner 600 split'}
              aria-label="Quick add"
              enterKeyHint="done"
              onKeyDown={(event) => event.key === 'Enter' && void save()}
              className="w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
            />
          </label>
        )}

        <div
          className={`tabular mt-3 text-center text-5xl font-semibold tracking-tight ${income ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
          aria-label="Amount"
        >
          <span className={income ? '' : 'text-zinc-400'}>{income ? '+₹' : '₹'}</span>
          {amountText || <span className="text-zinc-300 dark:text-zinc-600">0</span>}
        </div>
        {share !== null ? (
          <p className="mt-1 text-center text-sm font-medium text-zinc-500" aria-live="polite">
            Your share {formatINR(share)}
          </p>
        ) : null}

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setCategoryId(category.id);
                setPickedCategory(true);
              }}
              aria-pressed={categoryId === category.id}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
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

        <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto px-5">
          {dateChip(today, 'Today')}
          {dateChip(addDays(today, -1), 'Yesterday')}
          <button className={`relative flex shrink-0 items-center gap-1.5 ${chip(date !== today && date !== addDays(today, -1))}`}>
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

        {income ? null : (
          <div className="no-scrollbar mt-2 flex items-center gap-1.5 px-5" role="radiogroup" aria-label="Split">
            <span className="shrink-0 text-sm text-zinc-500">Split</span>
            {([null, 2, 3, 4, 'custom'] as const).map((value) => (
              <button
                key={String(value)}
                role="radio"
                aria-checked={split === value}
                aria-label={value === null ? 'Not split' : value === 'custom' ? 'Custom share' : `Split ${value} ways`}
                onClick={() => setSplit(value)}
                className={`shrink-0 ${chip(split === value)}`}
              >
                {value === null ? 'No' : value === 'custom' ? 'Custom' : `÷${value}`}
              </button>
            ))}
          </div>
        )}
        {!income && split === 'custom' ? (
          <label className="mx-5 mt-2 flex items-center rounded-2xl bg-white px-4 py-3 dark:bg-zinc-800">
            <span className="text-sm text-zinc-500">My share ₹</span>
            <input
              inputMode="decimal"
              value={customShare}
              onChange={(event) => setCustomShare(event.target.value)}
              placeholder="100"
              aria-label="My share"
              className="tabular ml-2 w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
            />
          </label>
        ) : null}
        {shareInvalid ? <p className="mx-6 mt-1 text-sm text-red-500">Your share must be less than the total.</p> : null}
        {!income && split === 'custom' && customShare.trim() === '' && amount !== null ? (
          <p className="mx-6 mt-1 text-sm text-zinc-500">Enter your part of the {formatINR(amount)}.</p>
        ) : null}

        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={income ? 'From whom / what for (optional)' : 'Note (optional)'}
          aria-label="Note"
          className="mx-5 mt-2 w-[calc(100%-2.5rem)] rounded-2xl bg-white px-4 py-2.5 text-base outline-none placeholder:text-zinc-400 dark:bg-zinc-800"
        />

        <div className="mt-2 grid grid-cols-3 gap-1 px-3">
          {KEYS.map((key) => (
            <button
              key={key}
              aria-label={key === 'del' ? 'Delete digit' : key}
              onClick={() => setAmountText((text) => pressKey(text, key))}
              className="tabular flex h-11 items-center justify-center rounded-2xl text-2xl font-medium transition-colors duration-100 active:bg-zinc-200 dark:active:bg-zinc-800"
            >
              {key === 'del' ? <Delete size={24} /> : key}
            </button>
          ))}
        </div>

        <div className="px-5 pt-2 pb-4">
          <button
            disabled={!canSave}
            onClick={() => void save()}
            className="h-14 w-full rounded-2xl bg-emerald-500 text-lg font-semibold text-white transition-transform active:scale-[0.98] disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
          >
            {amount === null ? 'Enter an amount' : editing ? 'Save' : `Add ${income ? '+' : ''}${formatINR(amount)}`}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
