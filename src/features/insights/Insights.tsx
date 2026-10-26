import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

import { Card, Empty, Screen } from '../../components/Screen';
import { useCategoryMap } from '../../hooks';
import { dayLabel, monthKey } from '../../lib/dates';
import { heatLevels, leadingBlanks, monthLabel, monthlyTrend, shiftMonth, summarizeMonth } from '../../lib/insights';
import { formatCompact, formatINR } from '../../lib/money';
import { useAllTxns } from '../activity/Activity';

const HEAT = ['', 'bg-emerald-500/20', 'bg-emerald-500/45', 'bg-emerald-500/70', 'bg-emerald-500'];
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Change({ total, previous, change, against }: { total: number; previous: number; change: number | null; against: string }) {
  if (change === null) return <p className="mt-1 text-sm text-zinc-500">No spending in {against} to compare with</p>;
  if (change === 0) return <p className="mt-1 text-sm text-zinc-500">Same as {against}</p>;
  const up = change > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  // Past ±100% a percentage stops meaning much; say the amount instead.
  const size = Math.abs(change) >= 1 ? formatINR(Math.round(Math.abs(total - previous) / 100) * 100) : `${Math.abs(Math.round(change * 100))}%`;
  return (
    <p className={`mt-1 flex items-center gap-1 text-sm font-medium ${up ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
      <Icon size={16} />
      {size} {up ? 'more' : 'less'} than {against}
    </p>
  );
}

/** "Oct", or "Jan ’27" where the year changes. */
function shortMonth(month: string): string {
  const name = monthLabel(month).slice(0, 3);
  return month.endsWith('-01') ? `${name} ’${month.slice(2, 4)}` : name;
}

/** Donut of category shares. */
function Donut({ slices }: { slices: { value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 15.9155; // circumference 100
  let offset = 25;
  return (
    <svg viewBox="0 0 42 42" className="size-32 shrink-0" aria-hidden>
      <circle cx="21" cy="21" r={r} fill="none" strokeWidth="6" className="stroke-zinc-100 dark:stroke-zinc-800" />
      {slices.map((slice, i) => {
        const pct = (slice.value / total) * 100;
        const el = (
          <circle
            key={i}
            cx="21"
            cy="21"
            r={r}
            fill="none"
            stroke={slice.color}
            strokeWidth="6"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeDashoffset={offset}
          />
        );
        offset -= pct;
        return el;
      })}
    </svg>
  );
}

export function Insights({ today }: { today: string }) {
  const txns = useAllTxns();
  const categories = useCategoryMap();
  const [month, setMonth] = useState(monthKey(today));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  if (txns === undefined) return <Screen title="Insights">{null}</Screen>;
  if (txns.length === 0) {
    return (
      <Screen title="Insights">
        <Empty emoji="📊" title="Nothing to show yet" message="Add a few expenses and your trends appear here." />
      </Screen>
    );
  }

  const summary = summarizeMonth(txns, month, today);
  const isCurrent = month === monthKey(today);
  const previousName = monthLabel(shiftMonth(month, -1)).split(' ')[0]!;
  // Always the six months up to now, so the chart doesn't slide while browsing.
  const trend = monthlyTrend(txns, monthKey(today));
  const trendMax = Math.max(1, ...trend.map((m) => m.total));
  const levels = heatLevels(summary.daily);
  const firstMonth = monthKey(txns[txns.length - 1]!.date);

  const go = (by: number) => {
    setMonth((m) => shiftMonth(m, by));
    setSelectedDay(null);
  };

  return (
    <Screen title="Insights">
      <div className="mb-3 flex items-center justify-between">
        <button aria-label="Previous month" onClick={() => go(-1)} disabled={month <= firstMonth} className="rounded-full p-2 disabled:opacity-30">
          <ChevronLeft size={22} />
        </button>
        <span className="font-semibold" aria-live="polite">
          {monthLabel(month)}
        </span>
        <button aria-label="Next month" onClick={() => go(1)} disabled={isCurrent} className="rounded-full p-2 disabled:opacity-30">
          <ChevronRight size={22} />
        </button>
      </div>

      <Card className="p-5">
        <p className="text-sm font-medium text-zinc-500">{isCurrent ? 'Spent so far' : 'Spent'}</p>
        <p className="tabular mt-1 text-4xl font-bold tracking-tight">{formatINR(summary.total)}</p>
        <Change
          total={summary.total}
          previous={summary.previous}
          change={summary.change}
          against={isCurrent ? `the same point in ${previousName}` : previousName}
        />
        {summary.projected !== null ? (
          <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-500 dark:border-zinc-800">
            On this pace you’ll spend about <span className="tabular font-semibold text-zinc-900 dark:text-zinc-100">{formatINR(summary.projected)}</span> by month end.
          </p>
        ) : null}
      </Card>

      <h2 className="mt-6 mb-1.5 px-1 text-sm font-medium text-zinc-500">Last 6 months</h2>
      <Card className="p-4">
        <div className="flex h-32 items-end gap-2">
          {trend.map((m) => (
            <button
              key={m.month}
              disabled={m.month < firstMonth}
              onClick={() => {
                setMonth(m.month);
                setSelectedDay(null);
              }}
              aria-label={`${monthLabel(m.month)}: ${formatINR(m.total)}`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1 disabled:opacity-40"
            >
              <span className="tabular text-[10px] text-zinc-500">{m.total ? formatCompact(m.total) : ''}</span>
              <span
                className={`w-full rounded-md ${m.month === month ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                style={{ height: `${Math.max(m.total ? 4 : 2, (m.total / trendMax) * 80)}%` }}
              />
              <span className="text-[11px] whitespace-nowrap text-zinc-500">{shortMonth(m.month)}</span>
            </button>
          ))}
        </div>
      </Card>

      {summary.byCategory.length > 0 ? (
        <>
          <h2 className="mt-6 mb-1.5 px-1 text-sm font-medium text-zinc-500">Where it went</h2>
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <Donut slices={summary.byCategory.map((c) => ({ value: c.total, color: categories.get(c.categoryId)?.color ?? '#71717a' }))} />
              <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
                {summary.byCategory.slice(0, 5).map((c) => (
                  <li key={c.categoryId} className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: categories.get(c.categoryId)?.color ?? '#71717a' }} />
                    <span className="truncate">{categories.get(c.categoryId)?.name ?? 'Other'}</span>
                    <span className="tabular ml-auto text-zinc-500">{Math.round((c.total / summary.total) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="mt-4 divide-y divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
              {summary.byCategory.map((c) => {
                const category = categories.get(c.categoryId);
                const diff = c.total - c.previous;
                return (
                  <li key={c.categoryId} className="flex items-center gap-3 py-2.5">
                    <span aria-hidden>{category?.emoji ?? '📦'}</span>
                    <span className="flex-1 font-medium">{category?.name ?? 'Other'}</span>
                    {c.previous > 0 && diff !== 0 ? (
                      <span className={`tabular text-xs ${diff > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {diff > 0 ? '+' : '−'}
                        {formatCompact(Math.abs(diff))}
                      </span>
                    ) : null}
                    <span className="tabular font-semibold">{formatINR(c.total)}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      ) : null}

      <h2 className="mt-6 mb-1.5 px-1 text-sm font-medium text-zinc-500">Daily spending</h2>
      <Card className="p-4">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-zinc-400">
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
          {Array.from({ length: leadingBlanks(month) }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {summary.daily.map((amount, i) => {
            const day = i + 1;
            const iso = `${month}-${String(day).padStart(2, '0')}`;
            const future = iso > today;
            return (
              <button
                key={day}
                disabled={future}
                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                aria-label={`${dayLabel(iso, today)}: ${formatINR(amount)}`}
                className={`tabular aspect-square rounded-md text-[11px] ${
                  levels[i] ? `${HEAT[levels[i]!]} ${levels[i]! >= 3 ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}` : 'bg-zinc-100 dark:bg-zinc-800'
                } ${future ? 'opacity-40' : ''} ${selectedDay === day ? 'ring-2 ring-zinc-900 dark:ring-white' : ''}`}
              >
                {day}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-sm text-zinc-500" aria-live="polite">
          {selectedDay
            ? `${dayLabel(`${month}-${String(selectedDay).padStart(2, '0')}`, today)} · ${formatINR(summary.daily[selectedDay - 1] ?? 0)}`
            : 'Tap a day to see what you spent'}
        </p>
      </Card>
    </Screen>
  );
}
