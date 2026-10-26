import { parseAmount } from './money';

/**
 * Does an expense match a search? Words must all match the note or category
 * name. A whole number matches the rupee amount ("40" finds ₹40 and ₹40.50,
 * not ₹140); a decimal matches exactly ("40.5" finds ₹40.50).
 */
export function matchesSearch(txn: { amount: number; note: string }, categoryName: string, query: string): boolean {
  const words = query.toLowerCase().replace(/[₹,+]/g, '').split(/\s+/).filter(Boolean);
  const text = `${txn.note} ${categoryName}`.toLowerCase();
  const rupees = String(Math.floor(txn.amount / 100));
  return words.every((word) => {
    if (/^\d+$/.test(word)) return rupees === word;
    if (/^\d*\.\d{1,2}$/.test(word)) return parseAmount(word) === txn.amount;
    return text.includes(word);
  });
}
