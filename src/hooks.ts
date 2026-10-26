import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';

import { db, type Category } from './db';
import { toISODate } from './lib/dates';

/** Today's local date; refreshes when the app comes back after midnight. */
export function useToday(): string {
  const [today, setToday] = useState(() => toISODate(new Date()));
  useEffect(() => {
    const refresh = () => setToday(toISODate(new Date()));
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);
  return today;
}

export function useCategories(): Category[] {
  return (
    useLiveQuery(async () => {
      const categories = await db.categories.orderBy('order').toArray();
      // The catch-alls ("Other", "Other income") always come last.
      const last = (c: Category) => c.id === 'other' || c.id === 'income-other';
      return [...categories.filter((c) => !last(c)), ...categories.filter(last)];
    }, []) ?? []
  );
}

/** Categories for one direction: expense (default) or money in. */
export function useCategoriesOf(kind: 'expense' | 'income'): Category[] {
  return useCategories().filter((c) => (c.kind === 'income') === (kind === 'income'));
}

export function useCategoryMap(): Map<string, Category> {
  const categories = useCategories();
  return new Map(categories.map((category) => [category.id, category]));
}

/** A stored setting, or `fallback` until it loads or when it is unset. */
export function useSetting<T>(key: string, fallback: T): T {
  return useLiveQuery(async () => ((await db.settings.get(key))?.value as T | undefined) ?? fallback, [key]) ?? fallback;
}
