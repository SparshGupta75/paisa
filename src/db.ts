import Dexie, { type EntityTable } from 'dexie';

import { DEFAULT_CATEGORIES } from './lib/categories';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  order: number;
  /** Optional monthly limit in paise. */
  budget?: number | null;
}

export interface Txn {
  id: string;
  /** Integer paise, always positive (an expense). */
  amount: number;
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

db.on('populate', (tx) => {
  void tx
    .table('categories')
    .bulkAdd(DEFAULT_CATEGORIES.map(({ id, name, emoji, color }, order) => ({ id, name, emoji, color, order })));
});

export function newId(): string {
  return crypto.randomUUID();
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

/** Deletes a category, moving its expenses to "Other". */
export async function deleteCategory(id: string): Promise<void> {
  if (id === 'other') return;
  await db.transaction('rw', db.categories, db.txns, async () => {
    await db.txns.where('categoryId').equals(id).modify({ categoryId: 'other' });
    await db.categories.delete(id);
  });
}

/** Remembers that `merchant` belongs in `categoryId` for future imports. */
export async function learnRule(merchant: string | undefined, categoryId: string): Promise<void> {
  const key = merchant?.trim().toLowerCase();
  if (!key) return;
  await db.rules.put({ merchant: key, categoryId });
}
