import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';

import { Card, Screen } from '../../components/Screen';
import type { Category } from '../../db';
import { useCategories, useSetting } from '../../hooks';
import { formatINR } from '../../lib/money';
import { BudgetSheet } from '../budget/BudgetSheet';
import { CategorySheet } from './CategorySheet';

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

export function Settings() {
  const categories = useCategories();
  const budget = useSetting<number | null>('monthlyBudget', null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);

  return (
    <Screen title="Settings">
      <h2 className="mb-1.5 px-1 text-sm font-medium text-zinc-500">Budget</h2>
      <Card>
        <Row label="Monthly budget" value={budget ? formatINR(budget) : 'Not set'} onPress={() => setEditingBudget(true)} />
      </Card>

      <h2 className="mt-6 mb-1.5 px-1 text-sm font-medium text-zinc-500">Categories</h2>
      <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {categories.map((category) => (
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
          onClick={() => setEditing('new')}
          className="flex w-full items-center gap-3 px-4 py-3.5 font-medium text-emerald-600 dark:text-emerald-400"
        >
          <Plus size={20} className="mx-1.5" />
          Add category
        </button>
      </Card>

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
        category={editing === 'new' ? null : editing}
        nextOrder={Math.max(0, ...categories.map((c) => c.order)) + 1}
      />
    </Screen>
  );
}
