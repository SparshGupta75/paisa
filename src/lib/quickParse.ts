import { INCOME_CATEGORIES, guessCategory } from './categories';
import { addDays, fromISODate, toISODate } from './dates';
import { parseAmount } from './money';

export interface QuickEntry {
  type: 'expense' | 'income';
  amount: number | null;
  /** Split between this many people (you included), or null when not split. */
  splitWays: number | null;
  note: string;
  /** Null when the text names no date, so a date picked by hand is kept. */
  date: string | null;
  categoryId: string | null;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** Reads one date word. Ordinals and weekdays mean the most recent such day, never the future. */
function parseDateWord(word: string, today: string): string | null {
  const w = word.toLowerCase();
  if (w === 'today') return today;
  if (w === 'yesterday' || w === 'yday') return addDays(today, -1);

  const ordinal = /^(\d{1,2})(st|nd|rd|th)$/.exec(w);
  if (ordinal) {
    const day = Number(ordinal[1]);
    if (day < 1 || day > 31) return null;
    const date = fromISODate(today);
    const candidate = new Date(date.getFullYear(), date.getMonth(), day);
    if (candidate.getMonth() !== date.getMonth() || toISODate(candidate) > today) {
      const previous = new Date(date.getFullYear(), date.getMonth() - 1, day);
      // e.g. "31st" in a month after a 30-day month: no such day, skip.
      if (previous.getDate() !== day) return null;
      return toISODate(previous);
    }
    return toISODate(candidate);
  }

  const slash = /^(\d{1,2})\/(\d{1,2})$/.exec(w);
  if (slash) {
    const date = fromISODate(today);
    const day = Number(slash[1]);
    const month = Number(slash[2]) - 1;
    let candidate = new Date(date.getFullYear(), month, day);
    if (candidate.getMonth() !== month || candidate.getDate() !== day) return null;
    if (toISODate(candidate) > today) candidate = new Date(date.getFullYear() - 1, month, day);
    return toISODate(candidate);
  }

  const weekday = WEEKDAYS.findIndex((name) => name === w || name.slice(0, 3) === w);
  if (weekday >= 0) {
    const back = (fromISODate(today).getDay() - weekday + 7) % 7 || 7;
    return addDays(today, -back);
  }
  return null;
}

// Money in only when it's unmistakable, so "uber from airport" or "income tax" stay expenses:
// a leading verb ("got 200 from rahul"), a "+" amount, or a salary/refund word.
const INCOME_VERBS = new Set(['got', 'received', 'recd', 'rcvd', 'credited', 'earned']);
const INCOME_NOTES = new Set(['salary', 'payroll', 'stipend', 'bonus', 'refund', 'cashback', 'reversal']);

/**
 * "chai 40", "uber 320 yesterday", "rent 15k 1st", "₹1,200 groceries mon".
 * Money in: "+200 rahul", "got 200 from rahul", "salary 50k".
 * The first amount-looking word is the amount, date words set the date, and
 * everything else is the note.
 */
export function quickParse(text: string, today: string): QuickEntry {
  let amount: number | null = null;
  let date: string | null = null;
  let income = false;
  let splitWays: number | null = null;
  const noteWords: string[] = [];
  const words = text.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    // "split" = two ways; "split 3" = three ways (you included). The number after
    // "split" is the ways only when there's an amount elsewhere ("dinner split 3 900").
    if (/^split$/i.test(word)) {
      const ways = Number(words[i + 1]);
      const amountLater = words.slice(i + 2).some((w) => parseAmount(w) !== null);
      if (/^\d+$/.test(words[i + 1] ?? '') && ways >= 2 && ways <= 50 && (amount !== null || amountLater)) {
        splitWays = ways;
        i++;
      } else splitWays = 2;
      continue;
    }
    if (amount === null) {
      const parsed = parseAmount(word);
      if (parsed !== null) {
        amount = parsed;
        if (word.startsWith('+')) income = true;
        continue;
      }
    }
    const lower = word.toLowerCase();
    if (i === 0 && INCOME_VERBS.has(lower)) {
      income = true;
      continue;
    }
    // "from" only drops out of the note once we know it's money in ("got 200 from rahul").
    if (income && lower === 'from') continue;
    if (INCOME_NOTES.has(lower)) income = true;
    const parsedDate = parseDateWord(word, today);
    if (parsedDate) {
      date = parsedDate;
      continue;
    }
    noteWords.push(word);
  }

  if (income) {
    return {
      type: 'income',
      amount,
      splitWays: null,
      note: noteWords.join(' '),
      date,
      categoryId: guessCategory(noteWords, INCOME_CATEGORIES) ?? 'people',
    };
  }
  return { type: 'expense', amount, splitWays, note: noteWords.join(' '), date, categoryId: guessCategory(noteWords) };
}

/** Your share of `amount` split `ways` ways, rounded to the paisa; you absorb any remainder. */
export function shareOf(amount: number, ways: number): number {
  return Math.ceil(amount / ways);
}
