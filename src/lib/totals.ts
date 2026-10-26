import type { Txn } from '../db';

type Entry = Pick<Txn, 'amount' | 'share' | 'type'>;

/** What these entries cost you: expenses at your share, money in ignored. */
export function spentOf(txns: Entry[]): number {
  return txns.reduce((sum, t) => (t.type === 'income' ? sum : sum + (t.share ?? t.amount)), 0);
}

/** Money in among these entries. */
export function receivedOf(txns: Entry[]): number {
  return txns.reduce((sum, t) => (t.type === 'income' ? sum + t.amount : sum), 0);
}
