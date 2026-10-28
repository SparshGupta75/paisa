/** A plain-language reason for a failed write, saying what to do next. */
export function saveErrorMessage(error: unknown): string {
  const name = (error as { name?: string })?.name ?? '';
  const inner = (error as { inner?: { name?: string } })?.inner?.name ?? '';
  if (/quota/i.test(name) || /quota/i.test(inner)) {
    return 'Storage for Paisa is full. Back up from Settings, then delete old entries.';
  }
  return 'Couldn’t save. Nothing was lost; try again.';
}
