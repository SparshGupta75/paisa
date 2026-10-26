import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { Card } from '../../components/Screen';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { useSetting } from '../../hooks';
import { MAX_BACKUP_BYTES, describeBackup, parseBackup, type Backup } from '../../lib/backup';
import { backUp, exportCSV, restore } from './backupActions';

export function lastBackupLabel(lastBackupAt: number | null, now = Date.now()): string {
  if (!lastBackupAt) return 'Never backed up';
  const days = Math.floor((now - lastBackupAt) / 86_400_000);
  return days === 0 ? 'Backed up today' : `Last backup ${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export function DataSection({ expenseCount }: { expenseCount: number }) {
  const toast = useToast();
  const lastBackupAt = useSetting<number | null>('lastBackupAt', null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);

  const action = (label: string, Icon: typeof Download, onPress: () => void) => (
    <button onClick={onPress} className="flex w-full items-center gap-3 px-4 py-3.5 text-left font-medium active:bg-zinc-100 dark:active:bg-zinc-800">
      <Icon size={20} className="mx-1.5 text-emerald-600 dark:text-emerald-400" />
      {label}
    </button>
  );

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      toast('That file is too large to be a Paisa backup.');
      return;
    }
    try {
      setPending(parseBackup(await file.text()));
    } catch (error) {
      toast((error as Error).message);
    }
  };

  return (
    <>
      <h2 className="mt-6 mb-1.5 px-1 text-sm font-medium text-zinc-500">Your data</h2>
      <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {action('Back up', Download, async () => {
          if (await backUp()) toast('Backup saved');
        })}
        {action('Export as CSV', FileSpreadsheet, async () => {
          if (await exportCSV()) toast('CSV exported');
        })}
        {action('Restore from backup', Upload, () => fileInput.current?.click())}
      </Card>
      <p className="mt-1.5 px-1 text-sm text-zinc-500">
        {lastBackupLabel(lastBackupAt)}. Your data lives only on this device; removing Paisa from your Home Screen deletes it.
      </p>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        aria-label="Backup file"
        className="hidden"
        onChange={(event) => {
          void pick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <Sheet open={pending !== null} onClose={() => setPending(null)} label="Restore backup">
        {pending ? (
          <div className="px-5 pt-6 pb-6">
            <p className="text-lg font-semibold">Restore this backup?</p>
            <p className="mt-2 text-zinc-500">
              It has {describeBackup(pending)} from{' '}
              {new Date(pending.exportedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. It replaces
              everything on this device ({expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'} now). This can’t be undone.
            </p>
            <button
              onClick={async () => {
                try {
                  await restore(pending);
                  toast('Backup restored');
                } catch {
                  toast('Couldn’t restore that backup. Nothing was changed.');
                }
                setPending(null);
              }}
              className="mt-6 h-14 w-full rounded-2xl bg-red-500 text-lg font-semibold text-white"
            >
              Replace with backup
            </button>
            <button onClick={() => setPending(null)} className="mt-2 h-12 w-full rounded-2xl font-medium text-zinc-500">
              Cancel
            </button>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
