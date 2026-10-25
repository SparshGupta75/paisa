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
 *   4. Keep DDL idempotent where cheap (`IF NOT EXISTS`), so a partially
 *      applied migration can be re-run without bricking the database.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS settings (
          key        TEXT PRIMARY KEY NOT NULL,
          value      TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
      `);
    },
  },
];

/**
 * Runs pending migrations inside exclusive transactions and records progress in
 * `PRAGMA user_version`.
 *
 * Passed to `<SQLiteProvider onInit>`, which awaits it before rendering children
 * (paired with `useSuspense`) so no screen can query a half-built schema.
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  // These PRAGMAs are connection-scoped and must run outside a transaction.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  assertMigrationsAreSane();

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  const pending = migrations
    .filter((migration) => migration.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    // `version` is a checked integer literal from code, never user input.
    const version = migration.version;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await migration.up(txn);
      await txn.execAsync(`PRAGMA user_version = ${version}`);
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
