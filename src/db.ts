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

export const db = new Dexie('paisa') as Dexie & {
  categories: EntityTable<Category, 'id'>;
  txns: EntityTable<Txn, 'id'>;
};

db.version(1).stores({
  categories: 'id, order',
  txns: 'id, date, categoryId, createdAt',
});

db.on('populate', (tx) => {
  void tx
    .table('categories')
    .bulkAdd(DEFAULT_CATEGORIES.map(({ id, name, emoji, color }, order) => ({ id, name, emoji, color, order })));
});

export function newId(): string {
  return crypto.randomUUID();
}
