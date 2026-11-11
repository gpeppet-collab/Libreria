import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrate';

export const DATABASE_NAME = 'libreria.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Apre (una sola volta) il database locale e applica le migrazioni mancanti.
 * Tutti i repository ricevono l'istanza da qui (vedi `repositories.ts`).
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((err: unknown) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL');
  await runMigrations(db);
  return db;
}
