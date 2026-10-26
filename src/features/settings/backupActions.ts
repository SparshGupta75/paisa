import { db, setSetting } from '../../db';
import { buildBackup, toCSV, type Backup } from '../../lib/backup';
import { toISODate } from '../../lib/dates';
import { saveFile } from '../../lib/files';

export async function backUp(): Promise<boolean> {
  const [categories, txns, settings] = await Promise.all([db.categories.toArray(), db.txns.toArray(), db.settings.toArray()]);
  const backup = buildBackup({ categories, txns, settings: settings.filter((s) => s.key !== 'lastBackupAt') });
  const result = await saveFile(`paisa-backup-${toISODate(new Date())}.json`, JSON.stringify(backup), 'application/json');
  if (result === 'cancelled') return false;
  await setSetting('lastBackupAt', Date.now());
  return true;
}

export async function exportCSV(): Promise<boolean> {
  const [categories, txns] = await Promise.all([db.categories.toArray(), db.txns.toArray()]);
  const csv = toCSV(txns, new Map(categories.map((c) => [c.id, c])));
  return (await saveFile(`paisa-expenses-${toISODate(new Date())}.csv`, csv, 'text/csv')) !== 'cancelled';
}

/**
 * Replaces everything with the backup's contents, all or nothing. The device
 * now matches that backup, so it counts as backed up as of its export time.
 */
export async function restore(backup: Backup): Promise<void> {
  await db.transaction('rw', db.categories, db.txns, db.settings, async () => {
    await Promise.all([db.categories.clear(), db.txns.clear(), db.settings.clear()]);
    await db.categories.bulkAdd(backup.categories);
    await db.txns.bulkAdd(backup.txns);
    await db.settings.bulkAdd(backup.settings);
    await db.settings.put({ key: 'lastBackupAt', value: Date.parse(backup.exportedAt) });
  });
}
