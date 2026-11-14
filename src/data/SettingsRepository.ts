import type { SqlDatabase } from './SqlDatabase';

/** Chiavi delle impostazioni salvate nel database locale. */
export const SETTING_GOOGLE_BOOKS_API_KEY = 'google_books_api_key';
export const SETTING_THEME = 'theme';

/** Impostazioni chiave/valore dell'app. */
export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  /** Un valore vuoto o null elimina l'impostazione. */
  set(key: string, value: string | null): Promise<void>;
}

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SqlDatabase) {}

  async get(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  }

  async set(key: string, value: string | null): Promise<void> {
    const v = value?.trim();
    if (!v) {
      await this.db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
      return;
    }
    await this.db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, v],
    );
  }
}
