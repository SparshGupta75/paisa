/** The first user-perceived character, so "🍕🍔" or "👨‍👩‍👧 x" keeps one emoji. */
export function firstGrapheme(text: string): string {
  const segment = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text.trim())[Symbol.iterator]().next();
  return segment.done ? '' : segment.value.segment;
}
