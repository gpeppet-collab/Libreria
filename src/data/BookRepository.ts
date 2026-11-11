import type { Book, BookPatch, BookQuery, GroupCount, ImportResult, NewBook } from '@/domain/types';

/**
 * Accesso ai libri. L'implementazione su SQLite vive in `SqliteBookRepository.ts`.
 *
 * `create`/`update` ricevono i tag come nomi: il repository crea i tag mancanti
 * e aggiorna `book_tags` nella stessa transazione.
 */
export interface BookRepository {
  findAll(query?: BookQuery): Promise<Book[]>;
  findById(id: string): Promise<Book | null>;
  /** `isbn` già normalizzato a 13 cifre. */
  findByIsbn(isbn: string): Promise<Book | null>;
  create(book: NewBook): Promise<Book>;
  update(id: string, patch: BookPatch): Promise<Book>;
  remove(id: string): Promise<void>;
  count(): Promise<number>;
  /** Conteggi per la vista raggruppata (RF14). Include il gruppo "non indicato" con key null. */
  countBy(field: 'ageRange' | 'bookType' | 'status'): Promise<GroupCount[]>;
  /** Import (RF9): unione per id o ISBN secondo la strategia, in una sola transazione. */
  bulkUpsert(books: Book[], strategy: 'replace' | 'keep'): Promise<ImportResult>;
}
