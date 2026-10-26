import { FileUp } from 'lucide-react';
import { useRef, useState } from 'react';

import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { db, learnRule, newId, setSetting } from '../../db';
import { useCategories } from '../../hooks';
import { parseCSV } from '../../lib/csv';
import { dayLabel } from '../../lib/dates';
import { formatINR } from '../../lib/money';
import { categorize } from '../../lib/rules';
import { cleanMerchant, detectColumns, extractExpenses, importKeys, type ColumnMap } from '../../lib/statement';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface Row {
  key: string;
  date: string;
  amount: number;
  merchant: string;
  categoryId: string;
  include: boolean;
  /** Same day and amount as an expense you already have. */
  possibleDuplicate: boolean;
}

interface Pending {
  rows: string[][];
  /** -1 when the file has no header row. */
  headerRow: number;
  signature: string;
  /** Shown when the guessed columns found nothing. */
  note?: string;
}

const emptyMap: ColumnMap = { date: -1, description: -1, debit: -1, credit: -1, amount: -1, type: -1 };

export function ImportFlow({ today }: { today: string }) {
  const toast = useToast();
  const categories = useCategories();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mapping, setMapping] = useState<(Pending & { map: ColumnMap }) | null>(null);
  const [preview, setPreview] = useState<{ rows: Row[]; alreadyImported: number; changed: Set<string> } | null>(null);
  const [importing, setImporting] = useState(false);

  const buildPreview = async (rows: string[][], headerRow: number, map: ColumnMap, signature: string, quiet = false) => {
    const expenses = extractExpenses(rows, headerRow, map);
    if (expenses.length === 0) {
      if (!quiet) toast('No money-out lines found with those columns.');
      return false;
    }
    await setSetting(`importMap:${signature}`, map);
    const keys = importKeys(expenses);
    const [existing, rules, all] = await Promise.all([
      db.txns.where('importKey').anyOf(keys).toArray(),
      db.rules.toArray(),
      db.txns.toArray(),
    ]);
    const seen = new Set(existing.map((t) => t.importKey));
    const manual = new Set(all.filter((t) => !t.importKey).map((t) => `${t.date}|${t.amount}`));
    const ruleMap = new Map(rules.map((r) => [r.merchant, r.categoryId]));
    const validIds = new Set(categories.map((c) => c.id));

    const fresh: Row[] = [];
    for (const [i, expense] of expenses.entries()) {
      const key = keys[i]!;
      if (seen.has(key)) continue;
      const merchant = cleanMerchant(expense.raw);
      const possibleDuplicate = manual.has(`${expense.date}|${expense.amount}`);
      fresh.push({
        key,
        date: expense.date,
        amount: expense.amount,
        merchant,
        categoryId: categorize(merchant, ruleMap, validIds),
        include: !possibleDuplicate,
        possibleDuplicate,
      });
    }
    fresh.sort((a, b) => b.date.localeCompare(a.date));
    setPreview({ rows: fresh, alreadyImported: expenses.length - fresh.length, changed: new Set() });
    return true;
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast('That file is too large.');
      return;
    }
    if (!/\.(csv|txt)$/i.test(file.name) && !file.type.includes('csv') && !file.type.startsWith('text/')) {
      toast('Please choose a CSV file. Most banks offer “Download as CSV”.');
      return;
    }
    const rows = parseCSV(await file.text());
    if (!rows.some((r) => r.length >= 3)) {
      toast('That file has no table in it.');
      return;
    }
    const detected = detectColumns(rows);
    // No recognisable header: treat every row as data and let the user pick columns.
    const headerRow = detected?.headerRow ?? -1;
    const signature = headerRow >= 0 ? rows[headerRow]!.join('|').toLowerCase() : `no-header:${rows[0]!.length}`;
    const saved = (await db.settings.get(`importMap:${signature}`))?.value as ColumnMap | undefined;
    const map = saved ?? detected?.map;
    if (map && (await buildPreview(rows, headerRow, map, signature, true))) return;
    setMapping({
      rows,
      headerRow,
      signature,
      map: map ?? emptyMap,
      note: map ? 'No money-out lines were found with the guessed columns. Check them below.' : undefined,
    });
  };

  const setCategory = (merchant: string, categoryId: string) => {
    setPreview((p) =>
      p && {
        ...p,
        // A choice applies to every line from that merchant, and is remembered.
        rows: p.rows.map((r) => (r.merchant === merchant ? { ...r, categoryId } : r)),
        changed: new Set(p.changed).add(merchant),
      },
    );
  };

  const runImport = async () => {
    if (!preview || importing) return;
    setImporting(true);
    const chosen = preview.rows.filter((r) => r.include);
    const now = Date.now();
    await db.txns.bulkAdd(
      chosen.map((r, i) => ({
        id: newId(),
        amount: r.amount,
        date: r.date,
        categoryId: r.categoryId,
        note: r.merchant,
        merchant: r.merchant,
        importKey: r.key,
        createdAt: now + i,
        updatedAt: now + i,
      })),
    );
    for (const merchant of preview.changed) {
      const row = preview.rows.find((r) => r.merchant === merchant);
      if (row) await learnRule(merchant, row.categoryId);
    }
    setPreview(null);
    setImporting(false);
    toast(`Imported ${chosen.length} ${chosen.length === 1 ? 'expense' : 'expenses'}`);
  };

  const included = preview?.rows.filter((r) => r.include) ?? [];
  // Column labels: the header row, or "Column 2 · PVR Cinemas" from the first line when there is none.
  const headers = !mapping
    ? []
    : mapping.headerRow >= 0
      ? mapping.rows[mapping.headerRow]!
      : mapping.rows[0]!.map((value, i) => `Column ${i + 1} · ${value.slice(0, 24)}`);

  const columnSelect = (label: string, field: 'date' | 'description' | 'debit') => (
    <label className="block">
      <span className="px-1 text-sm text-zinc-500">{label}</span>
      <select
        aria-label={label}
        value={mapping?.map[field] ?? -1}
        onChange={(event) => setMapping((m) => m && { ...m, map: { ...m.map, [field]: Number(event.target.value), amount: -1, type: -1 } })}
        className="mt-1 h-12 w-full rounded-xl bg-white px-3 text-base dark:bg-zinc-800"
      >
        <option value={-1}>Choose a column</option>
        {headers.map((header, i) => (
          <option key={i} value={i}>
            {header || `Column ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <>
      <button
        onClick={() => fileInput.current?.click()}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left font-medium active:bg-zinc-100 dark:active:bg-zinc-800"
      >
        <FileUp size={20} className="mx-1.5 text-emerald-600 dark:text-emerald-400" />
        Import bank statement (CSV)
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv,text/plain"
        aria-label="Statement file"
        className="hidden"
        onChange={(event) => {
          void pick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <Sheet open={mapping !== null} onClose={() => setMapping(null)} label="Match columns">
        <div className="space-y-4 overflow-y-auto px-5 pt-5 pb-6">
          <div>
            <p className="text-lg font-semibold">Match the columns</p>
            <p className="mt-1 text-sm text-zinc-500">
              {mapping?.note ?? 'Tell Paisa which columns hold what. It remembers this for statements from the same bank.'}
            </p>
          </div>
          {columnSelect('Date', 'date')}
          {columnSelect('Description', 'description')}
          {columnSelect('Money out (withdrawal / debit)', 'debit')}
          <button
            disabled={!mapping || mapping.map.date < 0 || mapping.map.description < 0 || mapping.map.debit < 0}
            onClick={async () => {
              if (!mapping) return;
              if (await buildPreview(mapping.rows, mapping.headerRow, mapping.map, mapping.signature)) setMapping(null);
            }}
            className="h-14 w-full rounded-2xl bg-emerald-500 text-lg font-semibold text-white disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
          >
            Continue
          </button>
        </div>
      </Sheet>

      <Sheet open={preview !== null} onClose={() => setPreview(null)} label="Review import">
        {preview ? (
          <>
            <div className="flex items-center justify-between px-5 pt-4">
              <button onClick={() => setPreview(null)} className="w-16 text-left text-zinc-500">
                Cancel
              </button>
              <span className="font-semibold">Review import</span>
              <span className="w-16" />
            </div>
            <p className="px-5 pt-3 text-sm text-zinc-500">
              {preview.rows.length === 0
                ? 'Everything in this file is already in Paisa.'
                : 'Check the categories. Changing one applies to that merchant and is remembered next time.'}
              {preview.alreadyImported > 0 ? ` ${preview.alreadyImported} already imported, skipped.` : ''}
            </p>
            <ul className="no-scrollbar mt-3 flex-1 divide-y divide-zinc-200 overflow-y-auto border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {preview.rows.map((row) => (
                <li key={row.key} className={`flex items-center gap-3 px-5 py-2.5 ${row.include ? '' : 'opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={row.include}
                    aria-label={`Include ${row.merchant} ${formatINR(row.amount)}`}
                    onChange={() =>
                      setPreview((p) => p && { ...p, rows: p.rows.map((r) => (r.key === row.key ? { ...r, include: !r.include } : r)) })
                    }
                    className="size-5 shrink-0 accent-emerald-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-medium">{row.merchant}</span>
                      <span className="tabular shrink-0 font-semibold">{formatINR(row.amount)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-sm text-zinc-500">
                      <span>
                        {dayLabel(row.date, today)}
                        {row.possibleDuplicate ? <span className="ml-1.5 text-amber-600">· possible duplicate</span> : null}
                      </span>
                      <select
                        aria-label={`Category for ${row.merchant}`}
                        value={row.categoryId}
                        onChange={(event) => setCategory(row.merchant, event.target.value)}
                        className="max-w-36 rounded-lg bg-zinc-100 px-2 py-1 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.emoji} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-5 pt-3 pb-4">
              <button
                disabled={included.length === 0 || importing}
                onClick={() => void runImport()}
                className="h-14 w-full rounded-2xl bg-emerald-500 text-lg font-semibold text-white disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
              >
                {included.length === 0
                  ? 'Nothing to import'
                  : `Import ${included.length} · ${formatINR(included.reduce((sum, r) => sum + r.amount, 0))}`}
              </button>
            </div>
          </>
        ) : null}
      </Sheet>
    </>
  );
}
