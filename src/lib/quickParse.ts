import { guessCategory } from './categories';
import { addDays, fromISODate, toISODate } from './dates';
import { parseAmount } from './money';

export interface QuickEntry {
  amount: number | null;
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

/**
 * "chai 40", "uber 320 yesterday", "rent 15k 1st", "₹1,200 groceries mon".
 * The first amount-looking word is the amount, date words set the date, and
 * everything else is the note.
 */
export function quickParse(text: string, today: string): QuickEntry {
  let amount: number | null = null;
  let date: string | null = null;
  const noteWords: string[] = [];

  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (amount === null) {
      const parsed = parseAmount(word);
      if (parsed !== null) {
        amount = parsed;
        continue;
      }
    }
    const parsedDate = parseDateWord(word, today);
    if (parsedDate) {
      date = parsedDate;
      continue;
    }
    noteWords.push(word);
  }

  return { amount, note: noteWords.join(' '), date, categoryId: guessCategory(noteWords) };
}
