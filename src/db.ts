import Dexie, { type EntityTable } from 'dexie';

import { DEFAULT_CATEGORIES } from './lib/categories';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  order: number;
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
}

export interface Setting {
  key: string;
  value: unknown;
}

export const db = new Dexie('paisa') as Dexie & {
  categories: EntityTable<Category, 'id'>;
  txns: EntityTable<Txn, 'id'>;
  settings: EntityTable<Setting, 'key'>;
};

db.version(1).stores({
  categories: 'id, order',
  txns: 'id, date, categoryId, createdAt',
});

db.version(2).stores({ settings: 'key' });

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
