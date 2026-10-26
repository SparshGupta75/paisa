export interface CategorySeed {
  id: string;
  name: string;
  emoji: string;
  color: string;
  /** Lower-case words in a note that suggest this category. */
  keywords: string[];
}

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  { id: 'food', name: 'Food', emoji: '🍜', color: '#f97316', keywords: ['chai', 'tea', 'coffee', 'lunch', 'dinner', 'breakfast', 'snacks', 'swiggy', 'zomato', 'restaurant', 'cafe', 'pizza', 'biryani', 'food'] },
  { id: 'groceries', name: 'Groceries', emoji: '🛒', color: '#22c55e', keywords: ['groceries', 'grocery', 'blinkit', 'zepto', 'bigbasket', 'instamart', 'vegetables', 'milk', 'dmart', 'kirana'] },
  { id: 'transport', name: 'Transport', emoji: '🚕', color: '#3b82f6', keywords: ['uber', 'ola', 'rapido', 'auto', 'cab', 'taxi', 'metro', 'bus', 'train', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'irctc'] },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: '#ec4899', keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'clothes', 'shoes', 'shopping'] },
  { id: 'bills', name: 'Bills', emoji: '💡', color: '#eab308', keywords: ['electricity', 'bill', 'recharge', 'jio', 'airtel', 'vi', 'wifi', 'broadband', 'gas', 'water', 'dth'] },
  { id: 'rent', name: 'Rent', emoji: '🏠', color: '#8b5cf6', keywords: ['rent', 'maintenance', 'society'] },
  { id: 'health', name: 'Health', emoji: '💊', color: '#ef4444', keywords: ['medicine', 'pharmacy', 'doctor', 'hospital', 'apollo', 'pharmeasy', 'gym', 'lab'] },
  { id: 'fun', name: 'Fun', emoji: '🎬', color: '#06b6d4', keywords: ['movie', 'movies', 'pvr', 'inox', 'bookmyshow', 'party', 'drinks', 'beer', 'concert', 'game'] },
  { id: 'subscriptions', name: 'Subscriptions', emoji: '🔁', color: '#6366f1', keywords: ['netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'icloud', 'chatgpt', 'subscription'] },
  { id: 'other', name: 'Other', emoji: '📦', color: '#71717a', keywords: [] },
];

/** Money-in categories. `income-other` is the catch-all and can't be deleted. */
export const INCOME_CATEGORIES: CategorySeed[] = [
  { id: 'salary', name: 'Salary', emoji: '💼', color: '#10b981', keywords: ['salary', 'payroll', 'stipend', 'bonus'] },
  { id: 'people', name: 'From people', emoji: '🤝', color: '#0ea5e9', keywords: ['friend', 'split', 'splitwise', 'returned', 'back'] },
  { id: 'refund', name: 'Refunds', emoji: '↩️', color: '#a855f7', keywords: ['refund', 'cashback', 'reversal', 'return'] },
  { id: 'income-other', name: 'Other income', emoji: '💰', color: '#71717a', keywords: [] },
];

export function guessCategory(words: string[], categories: CategorySeed[] = DEFAULT_CATEGORIES): string | null {
  for (const word of words) {
    const hit = categories.find((category) => category.keywords.includes(word.toLowerCase()));
    if (hit) return hit.id;
  }
  return null;
}
