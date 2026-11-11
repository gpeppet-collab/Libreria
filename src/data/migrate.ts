import type { SqlDatabase } from './SqlDatabase';
import { MIGRATIONS } from './migrations';

/**
 * Applica, in transazione, le migrazioni non ancora registrate in `schema_migrations`.
 * Restituisce la versione finale dello schema.
 */
export async function runMigrations(db: SqlDatabase): Promise<number> {
  await db.execAsync('PRAGMA foreign_keys = ON');
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)',
  );
  const row = await db.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_migrations',
    [],
  );
  let current = row?.version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }
      await db.runAsync('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        migration.version,
        new Date().toISOString(),
      ]);
    });
    current = migration.version;
  }
  return current;
}
