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

  it('accepts money in and splits, and rejects bad splits', () => {
    const ok = { ...backup(), txns: [{ ...chai, share: 2000 }, { ...chai, id: 't9', type: 'income', categoryId: 'people' }] };
    expect(parseBackup(JSON.stringify(ok)).txns[1]!.categoryId).toBe('income-other'); // older backup without income categories
    expect(describeBackup(parseBackup(JSON.stringify(ok)))).toBe('1 expense (₹40) and 1 money in (+₹40)');
    const bad = (txn: Partial<Txn>) => JSON.stringify({ ...backup(), txns: [{ ...chai, ...txn }] });
    expect(() => parseBackup(bad({ share: 4000 }))).toThrow(/split/);
    expect(() => parseBackup(bad({ share: 0 }))).toThrow(/split/);
    expect(() => parseBackup(bad({ type: 'transfer' as 'income' }))).toThrow(/damaged/);
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
      'Date,Type,Amount (INR),Your share (INR),Category,Note',
      '2026-10-26,Expense,40.00,40.00,Food,chai',
      '2026-10-27,Expense,320.50,320.50,Other,"uber, office"',
      '',
    ]);
  });

  it('marks money in and split shares', () => {
    const split: Txn = { ...chai, id: 't3', amount: 20000, share: 10000, note: 'dinner' };
    const got: Txn = { ...chai, id: 't4', amount: 20000, type: 'income', categoryId: 'people', note: 'rahul' };
    const lines = toCSV([split, got], new Map([['food', food]])).split('\r\n');
    expect(lines[1]).toBe('2026-10-26,Expense,200.00,100.00,Food,dinner');
    expect(lines[2]).toBe('2026-10-26,Money in,200.00,,Other income,rahul');
  });
});
