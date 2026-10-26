import { describe, expect, it } from 'vitest';

import type { Category, Txn } from '../db';
import { buildBackup, csvCell, describeBackup, parseBackup, toCSV } from './backup';

const other: Category = { id: 'other', name: 'Other', emoji: '📦', color: '#71717a', order: 9 };
const food: Category = { id: 'food', name: 'Food', emoji: '🍜', color: '#f97316', order: 0, budget: 500000 };
const chai: Txn = { id: 't1', amount: 4000, date: '2026-10-26', categoryId: 'food', note: 'chai', createdAt: 1, updatedAt: 1 };

const backup = () => buildBackup({ categories: [food, other], txns: [chai], settings: [{ key: 'monthlyBudget', value: 3000000 }] });

describe('parseBackup', () => {
  it('round-trips a backup', () => {
    const parsed = parseBackup(JSON.stringify(backup()));
    expect(parsed.txns).toEqual([chai]);
    expect(parsed.categories).toEqual([food, other]);
    expect(describeBackup(parsed)).toBe('1 expense (₹40)');
  });

  it('rejects things that are not Paisa backups', () => {
    expect(() => parseBackup('not json')).toThrow(/isn’t JSON/);
    expect(() => parseBackup('{"hello":1}')).toThrow(/isn’t a Paisa backup/);
    expect(() => parseBackup(JSON.stringify({ ...backup(), version: 2 }))).toThrow();
  });

  it('rejects damaged records', () => {
    const bad = (txn: Partial<Txn>) => JSON.stringify({ ...backup(), txns: [{ ...chai, ...txn }] });
    expect(() => parseBackup(bad({ amount: -5 }))).toThrow(/damaged expense/);
    expect(() => parseBackup(bad({ amount: 1.5 }))).toThrow(/damaged expense/);
    expect(() => parseBackup(bad({ date: '26/10/2026' }))).toThrow(/damaged expense/);
    expect(() => parseBackup(bad({ date: '2026-13-45' }))).toThrow(/damaged expense/);
    expect(() => parseBackup(bad({ date: '2026-02-30' }))).toThrow(/damaged expense/);
    expect(() => parseBackup(JSON.stringify({ ...backup(), categories: [food] }))).toThrow(/Other/);
  });

  it('rejects duplicate ids', () => {
    expect(() => parseBackup(JSON.stringify({ ...backup(), txns: [chai, chai] }))).toThrow(/duplicate expenses/);
    expect(() => parseBackup(JSON.stringify({ ...backup(), categories: [food, food, other] }))).toThrow(/duplicate categories/);
  });

  it('moves expenses of unknown categories to Other', () => {
    const parsed = parseBackup(JSON.stringify({ ...backup(), txns: [{ ...chai, categoryId: 'gone' }] }));
    expect(parsed.txns[0]!.categoryId).toBe('other');
  });
});

describe('CSV export', () => {
  it('quotes and defuses dangerous cells', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('-5')).toBe("'-5");
  });

  it('writes a header and one row per expense, oldest first', () => {
    const later: Txn = { ...chai, id: 't2', date: '2026-10-27', amount: 32050, note: 'uber, office', categoryId: 'missing' };
    const csv = toCSV([later, chai], new Map([['food', food], ['other', other]]));
    expect(csv.split('\r\n')).toEqual([
      'Date,Amount (INR),Category,Note',
      '2026-10-26,40.00,Food,chai',
      '2026-10-27,320.50,Other,"uber, office"',
      '',
    ]);
  });
});
