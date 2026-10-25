import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'paisa.db';

interface Migration {
  /** Monotonically increasing. Matches `PRAGMA user_version`. */
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
}

/**
 * Append-only migration list.
 *
 * Rules (see docs/ARCHITECTURE.md#migrations):
 *   1. Never edit or reorder a migration that has shipped in a release.
 *   2. Never reuse a version number.
 *   3. Every migration must be safe to run on a device that already has data.
 *   4. Prefer plain `CREATE`/`ALTER` over `IF NOT EXISTS`: a migration that runs
 *      twice should fail loudly during development, not silently half-apply.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE settings (
          key        TEXT PRIMARY KEY NOT NULL,
          value      TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
      `);
    },
  },
];

/**
 * `SQLiteProvider.onInit` can be invoked more than once (Fast Refresh, a
 * remount after an error). Concurrent callers share one run so the same
 * migration can never execute twice in parallel.
 */
let inFlight: Promise<void> | null = null;

export function migrate(db: SQLiteDatabase): Promise<void> {
  if (!inFlight) {
    inFlight = runMigrations(db).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Connection-scoped PRAGMAs. These must run outside a transaction to apply.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  assertMigrationsAreSane();
  await assertForeignKeysEnabled(db);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  const pending = migrations
    .filter((migration) => migration.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    // Deliberately NOT `withExclusiveTransactionAsync`: that helper opens a
    // second connection, where the `foreign_keys = ON` pragma set above does
    // not apply, and SQLite ignores `PRAGMA foreign_keys` once a transaction is
    // open. Migrations run before any screen mounts (Suspense), so nothing else
    // can join this transaction.
    await db.withTransactionAsync(async () => {
      // Re-read inside the transaction: another connection may have applied it.
      const check = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      const appliedVersion = check?.user_version ?? 0;
      if (appliedVersion >= migration.version) return;

      await migration.up(db);

      // `version` is an integer validated by assertMigrationsAreSane().
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}

/** Cheap invariant check so a copy-paste mistake fails loudly in development. */
function assertMigrationsAreSane(): void {
  if (!__DEV__) return;

  const seen = new Set<number>();
  let previous = 0;
  for (const migration of migrations) {
    if (!Number.isInteger(migration.version) || migration.version < 1) {
      throw new Error(`Invalid migration version: ${migration.version}`);
    }
    if (seen.has(migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`);
    }
    if (migration.version <= previous) {
      throw new Error('Migrations must be declared in ascending version order.');
    }
    seen.add(migration.version);
    previous = migration.version;
  }
}

/**
 * Guards the assumption documented in `runMigrations`. If SQLite is not
 * enforcing foreign keys, a future `ALTER TABLE` rebuild can orphan rows
 * without any visible error, so fail loudly instead.
 */
async function assertForeignKeysEnabled(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
  if (row?.foreign_keys !== 1) {
    throw new Error(
      'SQLite foreign key enforcement is off. Migrations may corrupt related data.',
    );
  }
}
