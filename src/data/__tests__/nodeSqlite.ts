/**
 * Adapter di test: implementa `SqlDatabase` sopra `node:sqlite` (database in memoria).
 * Permette di testare i repository con un vero motore SQLite senza Expo.
 */
import { runMigrations } from '../migrate';
import type { SqlDatabase, SqlParams, SqlRunResult } from '../SqlDatabase';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => NodeDatabase;
};

interface NodeStatement {
  run(...params: SqlParams): { changes: number | bigint; lastInsertRowid: number | bigint };
  all(...params: SqlParams): unknown[];
  get(...params: SqlParams): unknown;
}
interface NodeDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
  close(): void;
}

export class NodeSqliteDatabase implements SqlDatabase {
  private readonly db: NodeDatabase;

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
  }

  async execAsync(source: string): Promise<void> {
    this.db.exec(source);
  }

  async runAsync(source: string, params: SqlParams): Promise<SqlRunResult> {
    const r = this.db.prepare(source).run(...params);
    return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
  }

  async getAllAsync<T>(source: string, params: SqlParams): Promise<T[]> {
    return this.db.prepare(source).all(...params) as T[];
  }

  async getFirstAsync<T>(source: string, params: SqlParams): Promise<T | null> {
    return (this.db.prepare(source).get(...params) as T | undefined) ?? null;
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await task();
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  close(): void {
    this.db.close();
  }
}

/** Database in memoria già migrato. */
export async function createTestDatabase(): Promise<NodeSqliteDatabase> {
  const db = new NodeSqliteDatabase();
  await runMigrations(db);
  return db;
}
