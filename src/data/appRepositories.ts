import { getDatabase } from './db';
import { createRepositories, type Repositories } from './repositories';
import type { SqliteBookRepositoryOptions } from './SqliteBookRepository';

let instance: Promise<Repositories> | null = null;

/** Repository dell'app, costruiti una sola volta sul database locale (expo-sqlite). */
export function getRepositories(options: SqliteBookRepositoryOptions = {}): Promise<Repositories> {
  if (!instance) {
    instance = getDatabase().then((db) => createRepositories(db, options));
  }
  return instance;
}
