import { ChevronRight, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';

import { Card, Screen } from '../../components/Screen';
import { db, type Category } from '../../db';
import { useCategories, useSetting } from '../../hooks';
import { formatINR } from '../../lib/money';
import { BudgetSheet } from '../budget/BudgetSheet';
import { CategorySheet } from './CategorySheet';
import { DataSection } from './DataSection';

function Row({ label, value, onPress, leading }: { label: string; value?: string; onPress: () => void; leading?: React.ReactNode }) {
  return (
    <button onClick={onPress} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-zinc-100 dark:active:bg-zinc-800">
      {leading}
      <span className="flex-1 font-medium">{label}</span>
      {value ? <span className="tabular text-zinc-500">{value}</span> : null}
      <ChevronRight size={18} className="text-zinc-300 dark:text-zinc-600" />
    </button>
  );
}

export function Settings({ today }: { today: string }) {
  const categories = useCategories();
  const budget = useSetting<number | null>('monthlyBudget', null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [editing, setEditing] = useState<Category | { new: 'expense' | 'income' } | null>(null);
  const expenseCount = useLiveQuery(() => db.txns.count(), []) ?? 0;

  return (
    <Screen title="Settings">
      <h2 className="mb-1.5 px-1 text-sm font-medium text-zinc-500">Budget</h2>
      <Card>
        <Row label="Monthly budget" value={budget ? formatINR(budget) : 'Not set'} onPress={() => setEditingBudget(true)} />
      </Card>

      {(['expense', 'income'] as const).map((kind) => (
        <div key={kind}>
          <h2 className="mt-6 mb-1.5 px-1 text-sm font-medium text-zinc-500">{kind === 'expense' ? 'Expense categories' : 'Money in categories'}</h2>
          <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {categories
              .filter((category) => (category.kind === 'income') === (kind === 'income'))
              .map((category) => (
                <Row
                  key={category.id}
                  label={category.name}
                  value={category.budget ? `${formatINR(category.budget)}/mo` : undefined}
                  onPress={() => setEditing(category)}
                  leading={
                    <span
                      className="flex size-8 items-center justify-center rounded-full text-base"
                      style={{ backgroundColor: `${category.color}22` }}
                      aria-hidden
                    >
                      {category.emoji}
                    </span>
                  }
                />
              ))}
            <button
              onClick={() => setEditing({ new: kind })}
              className="flex w-full items-center gap-3 px-4 py-3.5 font-medium text-emerald-600 transition-colors active:bg-zinc-100 dark:text-emerald-400 dark:active:bg-zinc-800"
            >
              <Plus size={20} className="mx-1.5" />
              {kind === 'expense' ? 'Add category' : 'Add money in category'}
            </button>
          </Card>
        </div>
      ))}

      <DataSection expenseCount={expenseCount} today={today} />

      <p className="mt-8 text-center text-xs text-zinc-400">Paisa · your data stays on this device</p>

      <BudgetSheet
        open={editingBudget}
        onClose={() => setEditingBudget(false)}
        title="Monthly budget"
        settingKey="monthlyBudget"
        current={budget}
      />
      <CategorySheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        category={editing && 'new' in editing ? null : editing}
        kind={editing && 'new' in editing ? editing.new : editing?.kind === 'income' ? 'income' : 'expense'}
        nextOrder={Math.max(0, ...categories.map((c) => c.order)) + 1}
      />
    </Screen>
  );
}
