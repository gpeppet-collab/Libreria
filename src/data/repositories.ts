import type { BookRepository } from './BookRepository';
import type { BookTypeRepository } from './BookTypeRepository';
import { SqliteSettingsRepository, type SettingsRepository } from './SettingsRepository';
import type { SqlDatabase } from './SqlDatabase';
import { SqliteBookRepository, type SqliteBookRepositoryOptions } from './SqliteBookRepository';
import { SqliteBookTypeRepository } from './SqliteBookTypeRepository';
import { SqliteTagRepository } from './SqliteTagRepository';
import type { TagRepository } from './TagRepository';

export interface Repositories {
  books: BookRepository;
  tags: TagRepository;
  bookTypes: BookTypeRepository;
  settings: SettingsRepository;
}

/**
 * Costruisce i repository su un database già migrato.
 * Non dipende da Expo: usato anche dai test con `node:sqlite`.
 * Per l'istanza dell'app vedi `appRepositories.ts`.
 */
export function createRepositories(
  db: SqlDatabase,
  options: SqliteBookRepositoryOptions = {},
): Repositories {
  return {
    books: new SqliteBookRepository(db, options),
    tags: new SqliteTagRepository(db),
    bookTypes: new SqliteBookTypeRepository(db),
    settings: new SqliteSettingsRepository(db),
  };
}
