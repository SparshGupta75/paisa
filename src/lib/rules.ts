import { guessCategory } from './categories';

/**
 * Category for an imported merchant: a rule learned from your choices first,
 * then the built-in keywords ("Swiggy" → Food), then Other. `validIds` drops
 * rules that point at deleted categories.
 */
export function categorize(merchant: string, rules: Map<string, string>, validIds: Set<string>): string {
  const ruled = rules.get(merchant.toLowerCase());
  if (ruled && validIds.has(ruled)) return ruled;
  const guessed = guessCategory(merchant.toLowerCase().split(/\s+/));
  return guessed && validIds.has(guessed) ? guessed : 'other';
}
