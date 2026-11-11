import { BUILTIN_BOOK_TYPES } from '@/domain/bookTypes';

/**
 * Migrazioni di schema, applicate in ordine e in transazione all'avvio (RNF5).
 * Regole:
 * - non modificare mai una migrazione già pubblicata: aggiungerne una nuova;
 * - ogni migrazione è una lista di statement SQL idempotenti rispetto alla versione precedente.
 */
export interface Migration {
  version: number;
  description: string;
  statements: string[];
}

const sqlQuote = (s: string) => `'${s.replace(/'/g, "''")}'`;

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description: 'Schema iniziale: books, book_types, tags, book_tags',
    statements: [
      `CREATE TABLE IF NOT EXISTS book_types (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
        builtin    INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS books (
        id             TEXT PRIMARY KEY,
        isbn           TEXT,
        title          TEXT NOT NULL,
        authors        TEXT NOT NULL DEFAULT '[]',
        publisher      TEXT,
        published_year INTEGER,
        page_count     INTEGER,
        description    TEXT,
        cover_path     TEXT,
        status         TEXT NOT NULL DEFAULT 'da_leggere',
        rating         INTEGER CHECK (rating BETWEEN 1 AND 5),
        notes          TEXT,
        started_at     TEXT,
        finished_at    TEXT,
        age_range      TEXT,
        book_type_id   TEXT REFERENCES book_types(id) ON DELETE SET NULL,
        created_at     TEXT NOT NULL,
        updated_at     TEXT NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn) WHERE isbn IS NOT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_books_title ON books(title COLLATE NOCASE)`,
      `CREATE INDEX IF NOT EXISTS idx_books_status ON books(status)`,
      `CREATE INDEX IF NOT EXISTS idx_books_age_range ON books(age_range)`,
      `CREATE INDEX IF NOT EXISTS idx_books_type ON books(book_type_id)`,
      `CREATE TABLE IF NOT EXISTS tags (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS book_tags (
        book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (book_id, tag_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_book_tags_tag ON book_tags(tag_id)`,
      ...BUILTIN_BOOK_TYPES.map(
        (t) =>
          `INSERT OR IGNORE INTO book_types (id, name, builtin, sort_order) VALUES (${sqlQuote(t.id)}, ${sqlQuote(t.name)}, 1, ${t.sortOrder})`,
      ),
    ],
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
