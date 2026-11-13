import { BUILTIN_BOOK_TYPES } from '@/domain/bookTypes';

import { runMigrations } from '../migrate';
import { LATEST_SCHEMA_VERSION } from '../migrations';
import { SqliteSettingsRepository } from '../SettingsRepository';
import { NodeSqliteDatabase } from './nodeSqlite';

describe('migrazioni', () => {
  it('porta un database vuoto all ultima versione e inserisce i tipi predefiniti', async () => {
    const db = new NodeSqliteDatabase();
    const version = await runMigrations(db);
    expect(version).toBe(LATEST_SCHEMA_VERSION);

    const types = await db.getAllAsync<{ id: string; builtin: number }>(
      'SELECT id, builtin FROM book_types ORDER BY sort_order',
      [],
    );
    expect(types).toHaveLength(BUILTIN_BOOK_TYPES.length);
    expect(types.every((t) => t.builtin === 1)).toBe(true);
    expect(types[0]?.id).toBe('albo_illustrato');

    const fk = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys', []);
    expect(fk?.foreign_keys).toBe(1);

    const settings = await db.getAllAsync('SELECT * FROM settings', []);
    expect(settings).toEqual([]);
    db.close();
  });

  it('salva, aggiorna ed elimina le impostazioni', async () => {
    const db = new NodeSqliteDatabase();
    await runMigrations(db);
    const repo = new SqliteSettingsRepository(db);
    expect(await repo.get('k')).toBeNull();
    await repo.set('k', '  valore ');
    expect(await repo.get('k')).toBe('valore');
    await repo.set('k', 'nuovo');
    expect(await repo.get('k')).toBe('nuovo');
    await repo.set('k', '  ');
    expect(await repo.get('k')).toBeNull();
    db.close();
  });

  it('è idempotente', async () => {
    const db = new NodeSqliteDatabase();
    await runMigrations(db);
    await runMigrations(db);
    const rows = await db.getAllAsync<{ version: number }>(
      'SELECT version FROM schema_migrations',
      [],
    );
    expect(rows).toHaveLength(LATEST_SCHEMA_VERSION);
    db.close();
  });
});
