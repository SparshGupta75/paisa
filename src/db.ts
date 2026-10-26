import Dexie, { type EntityTable } from 'dexie';

import { DEFAULT_CATEGORIES, INCOME_CATEGORIES } from './lib/categories';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  order: number;
  /** Optional monthly limit in paise (expense categories only). */
  budget?: number | null;
  /** Money-in category; absent for expense categories. */
  kind?: 'income';
}

export interface Txn {
  id: string;
  /** Integer paise, always positive; `type` says which way it went. */
  amount: number;
  /** Money in; absent for expenses (which is every record from before money in existed). */
  type?: 'income';
  /** For a split expense: your part of `amount`, in paise. */
  share?: number;
  /** Local calendar day, "YYYY-MM-DD". */
  date: string;
  categoryId: string;
  note: string;
  createdAt: number;
  updatedAt: number;
  /** Cleaned merchant name, for imported expenses. */
  merchant?: string;
  /** Identifies the statement line it came from, to skip it on re-import. */
  importKey?: string;
}

/** "Expenses at this merchant go in this category", learned from your choices. */
export interface Rule {
  /** Lower-case merchant name. */
  merchant: string;
  categoryId: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

export const db = new Dexie('paisa') as Dexie & {
  categories: EntityTable<Category, 'id'>;
  txns: EntityTable<Txn, 'id'>;
  settings: EntityTable<Setting, 'key'>;
  rules: EntityTable<Rule, 'merchant'>;
};

db.version(1).stores({
  categories: 'id, order',
  txns: 'id, date, categoryId, createdAt',
});

db.version(2).stores({ settings: 'key' });
db.version(3).stores({ txns: 'id, date, categoryId, createdAt, importKey', rules: 'merchant' });

const incomeSeed = () =>
  INCOME_CATEGORIES.map(({ id, name, emoji, color }, i) => ({ id, name, emoji, color, order: 100 + i, kind: 'income' as const }));

// Money in: add its categories to existing installs.
db.version(4)
  .stores({})
  .upgrade(async (tx) => {
    const table = tx.table('categories');
    for (const category of incomeSeed()) if (!(await table.get(category.id))) await table.add(category);
  });

db.on('populate', (tx) => {
  void tx
    .table('categories')
    .bulkAdd([...DEFAULT_CATEGORIES.map(({ id, name, emoji, color }, order) => ({ id, name, emoji, color, order })), ...incomeSeed()]);
});

export const isIncome = (txn: Pick<Txn, 'type'>) => txn.type === 'income';

/** What an expense really cost you: your share when split, otherwise the full amount. */
export const spend = (txn: Pick<Txn, 'amount' | 'share'>) => txn.share ?? txn.amount;

/** The catch-all category for each direction; these can't be deleted. */
export const FALLBACK = { expense: 'other', income: 'income-other' } as const;

/** Adds any missing money-in categories (e.g. after restoring an older backup). */
export async function ensureIncomeCategories(): Promise<void> {
  for (const category of incomeSeed()) if (!(await db.categories.get(category.id))) await db.categories.add(category);
}

export function newId(): string {
  return crypto.randomUUID();
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

/** Deletes a category, moving its entries to "Other" / "Other income". */
export async function deleteCategory(id: string): Promise<void> {
  if (id === FALLBACK.expense || id === FALLBACK.income) return;
  await db.transaction('rw', db.categories, db.txns, async () => {
    const category = await db.categories.get(id);
    const fallback = category?.kind === 'income' ? FALLBACK.income : FALLBACK.expense;
    await db.txns.where('categoryId').equals(id).modify({ categoryId: fallback });
    await db.categories.delete(id);
  });
}

/** Remembers that `merchant` belongs in `categoryId` for future imports. */
export async function learnRule(merchant: string | undefined, categoryId: string): Promise<void> {
  const key = merchant?.trim().toLowerCase();
  if (!key) return;
  await db.rules.put({ merchant: key, categoryId });
}
