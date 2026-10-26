import type { Category, Setting, Txn } from '../db';
import { fromISODate, toISODate } from './dates';
import { formatINR } from './money';

export interface Backup {
  app: 'paisa';
  version: 1;
  exportedAt: string;
  categories: Category[];
  txns: Txn[];
  settings: Setting[];
}

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export function buildBackup(data: { categories: Category[]; txns: Txn[]; settings: Setting[] }, now = new Date()): Backup {
  return { app: 'paisa', version: 1, exportedAt: now.toISOString(), ...data };
}

const isString = (v: unknown): v is string => typeof v === 'string';
/** A real calendar day: "2026-13-45" has the right shape but isn't one. */
const isISODate = (v: unknown) => isString(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && toISODate(fromISODate(v)) === v;

function assertUnique(values: string[], what: string): void {
  if (new Set(values).size !== values.length) throw new Error(`This backup has duplicate ${what}.`);
}
const isPaise = (v: unknown) => Number.isSafeInteger(v) && (v as number) > 0;

/** Parses and checks a backup file. Throws with a readable message when it isn't one. */
export function parseBackup(text: string): Backup {
  if (text.length > MAX_BACKUP_BYTES) throw new Error('That file is too large to be a Paisa backup.');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t a Paisa backup (it isn’t JSON).');
  }
  const backup = data as Partial<Backup>;
  if (backup?.app !== 'paisa' || backup.version !== 1) throw new Error('That file isn’t a Paisa backup.');
  if (!Array.isArray(backup.categories) || !Array.isArray(backup.txns) || !Array.isArray(backup.settings)) {
    throw new Error('This backup is incomplete.');
  }

  const categoryIds = new Set<string>();
  for (const c of backup.categories) {
    if (!isString(c?.id) || !isString(c.name) || !isString(c.emoji) || !isString(c.color) || typeof c.order !== 'number') {
      throw new Error('This backup has a damaged category.');
    }
    if (c.budget != null && !isPaise(c.budget)) throw new Error('This backup has a damaged category limit.');
    categoryIds.add(c.id);
  }
  if (!categoryIds.has('other')) throw new Error('This backup is missing the “Other” category.');
  for (const t of backup.txns) {
    if (!isString(t?.id) || !isPaise(t.amount) || !isISODate(t.date) || !isString(t.note) || !isString(t.categoryId)) {
      throw new Error('This backup has a damaged expense.');
    }
    if (typeof t.createdAt !== 'number' || typeof t.updatedAt !== 'number') throw new Error('This backup has a damaged expense.');
  }
  for (const s of backup.settings) {
    if (!isString(s?.key)) throw new Error('This backup has a damaged setting.');
  }
  assertUnique(backup.categories.map((c) => c.id), 'categories');
  assertUnique(backup.txns.map((t) => t.id), 'expenses');
  assertUnique(backup.settings.map((s) => s.key), 'settings');
  if (Number.isNaN(Date.parse(backup.exportedAt ?? ''))) throw new Error('This backup is damaged (no export date).');
  return {
    ...(backup as Backup),
    // Expenses pointing at a missing category fall back to Other rather than vanish.
    txns: backup.txns.map((t) => (categoryIds.has(t.categoryId) ? t : { ...t, categoryId: 'other' })),
  };
}

/** One CSV cell: quoted when needed, and never starting a spreadsheet formula. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCSV(txns: Txn[], categories: Map<string, Category>): string {
  const header = ['Date', 'Amount (INR)', 'Category', 'Note'];
  const rows = [...txns]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((t) => [t.date, (t.amount / 100).toFixed(2), categories.get(t.categoryId)?.name ?? 'Other', t.note]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function describeBackup(backup: Backup): string {
  const total = backup.txns.reduce((sum, t) => sum + t.amount, 0);
  return `${backup.txns.length} ${backup.txns.length === 1 ? 'expense' : 'expenses'} (${formatINR(total)})`;
}
