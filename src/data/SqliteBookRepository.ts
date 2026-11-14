import { normalizeIsbn } from '@/domain/isbn';
import { normalizeTagList } from '@/domain/tags';
import {
  AGE_RANGES,
  AGE_RANGE_LABELS,
  READING_STATUSES,
  READING_STATUS_LABELS,
  UNSET,
  type AgeRange,
  type Book,
  type BookPatch,
  type BookQuery,
  type GroupCount,
  type ImportResult,
  type NewBook,
  type Rating,
  type ReadingStatus,
} from '@/domain/types';

import type { BookRepository } from './BookRepository';
import { DuplicateIsbnError, InvalidIsbnError, NotFoundError, ValidationError } from './errors';
import { newId, nowIso } from './ids';
import { caseOrder, likeContains, placeholders } from './sql';
import type { SqlDatabase, SqlValue } from './SqlDatabase';

/** Riga della tabella `books` più i tag concatenati. */
interface BookRow {
  id: string;
  isbn: string | null;
  title: string;
  authors: string;
  publisher: string | null;
  published_year: number | null;
  page_count: number | null;
  description: string | null;
  cover_path: string | null;
  status: string;
  rating: number | null;
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
  age_range: string | null;
  book_type_id: string | null;
  created_at: string;
  updated_at: string;
  tag_names: string | null;
}

/** Separatore dei tag nel GROUP_CONCAT: i nomi normalizzati non contengono a capo. */
const TAG_SEP = '\n';

const SELECT_BOOK = `
  SELECT b.*,
    (SELECT GROUP_CONCAT(name, '${TAG_SEP}') FROM (
       SELECT t.name FROM book_tags bt JOIN tags t ON t.id = bt.tag_id
       WHERE bt.book_id = b.id ORDER BY t.name
     )) AS tag_names
  FROM books b`;

export interface SqliteBookRepositoryOptions {
  /** Chiamato dopo l'eliminazione di un libro (es. per cancellare la copertina locale). */
  onBookRemoved?: (book: Book) => Promise<void>;
}

export class SqliteBookRepository implements BookRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly options: SqliteBookRepositoryOptions = {},
  ) {}

  async findAll(query: BookQuery = {}): Promise<Book[]> {
    const where: string[] = [];
    const params: SqlValue[] = [];

    const text = query.text?.trim();
    if (text) {
      const like = likeContains(text);
      where.push(
        `(b.title LIKE ? ESCAPE '\\' OR b.authors LIKE ? ESCAPE '\\' OR b.isbn LIKE ? ESCAPE '\\')`,
      );
      params.push(like, like, like);
    }
    if (query.status) {
      where.push('b.status = ?');
      params.push(query.status);
    }
    if (query.ageRange === UNSET) {
      where.push('b.age_range IS NULL');
    } else if (query.ageRange) {
      where.push('b.age_range = ?');
      params.push(query.ageRange);
    }
    if (query.bookTypeId === UNSET) {
      where.push('b.book_type_id IS NULL');
    } else if (query.bookTypeId) {
      where.push('b.book_type_id = ?');
      params.push(query.bookTypeId);
    }
    const tags = normalizeTagList(query.tags ?? []);
    if (tags.length > 0) {
      where.push(
        `b.id IN (SELECT bt.book_id FROM book_tags bt JOIN tags t ON t.id = bt.tag_id
                  WHERE t.name IN (${placeholders(tags.length)})
                  GROUP BY bt.book_id HAVING COUNT(DISTINCT t.id) = ?)`,
      );
      params.push(...tags, tags.length);
    }

    const direction = query.direction === 'desc' ? 'DESC' : 'ASC';
    const orderBy: Record<NonNullable<BookQuery['sort']>, string> = {
      title: `b.title COLLATE NOCASE ${direction}`,
      author: `json_extract(b.authors, '$[0]') COLLATE NOCASE ${direction}, b.title COLLATE NOCASE ASC`,
      createdAt: `b.created_at ${direction}`,
      ageRange: `${caseOrder('b.age_range', AGE_RANGES)} ${direction}, b.title COLLATE NOCASE ASC`,
    };

    const sql = `${SELECT_BOOK}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${orderBy[query.sort ?? 'title']}`;
    const rows = await this.db.getAllAsync<BookRow>(sql, params);
    return rows.map(toBook);
  }

  async findById(id: string): Promise<Book | null> {
    const row = await this.db.getFirstAsync<BookRow>(`${SELECT_BOOK} WHERE b.id = ?`, [id]);
    return row ? toBook(row) : null;
  }

  async findByIsbn(isbn: string): Promise<Book | null> {
    const normalized = normalizeIsbn(isbn);
    if (!normalized) return null;
    const row = await this.db.getFirstAsync<BookRow>(`${SELECT_BOOK} WHERE b.isbn = ?`, [
      normalized,
    ]);
    return row ? toBook(row) : null;
  }

  async create(input: NewBook): Promise<Book> {
    const id = newId();
    const now = nowIso();
    const book: Book = { ...normalizeNewBook(input), id, createdAt: now, updatedAt: now };
    await this.db.withTransactionAsync(async () => {
      await this.assertIsbnFree(book.isbn, null);
      await this.insertRow(book);
      await this.syncTags(id, book.tags);
    });
    return this.mustFind(id);
  }

  async update(id: string, patch: BookPatch): Promise<Book> {
    await this.db.withTransactionAsync(async () => {
      const existing = await this.findById(id);
      if (!existing) throw new NotFoundError('Libro', id);
      const merged = normalizeNewBook({ ...existing, ...patch });
      await this.assertIsbnFree(merged.isbn, id);
      await this.updateRow(id, merged, nowIso());
      if (patch.tags !== undefined) await this.syncTags(id, merged.tags);
    });
    return this.mustFind(id);
  }

  async remove(id: string): Promise<void> {
    const book = await this.findById(id);
    if (!book) throw new NotFoundError('Libro', id);
    await this.db.runAsync('DELETE FROM books WHERE id = ?', [id]);
    await this.options.onBookRemoved?.(book);
  }

  async count(): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM books', []);
    return row?.n ?? 0;
  }

  async countBy(field: 'ageRange' | 'bookType' | 'status'): Promise<GroupCount[]> {
    if (field === 'bookType') {
      const rows = await this.db.getAllAsync<{
        key: string | null;
        label: string | null;
        n: number;
      }>(
        `SELECT b.book_type_id AS key, bt.name AS label, COUNT(*) AS n
         FROM books b LEFT JOIN book_types bt ON bt.id = b.book_type_id
         GROUP BY b.book_type_id
         ORDER BY bt.sort_order IS NULL, bt.sort_order, bt.name COLLATE NOCASE`,
        [],
      );
      return rows.map((r) => ({ key: r.key, label: r.label ?? 'Non indicato', count: r.n }));
    }
    const column = field === 'ageRange' ? 'age_range' : 'status';
    const values: readonly string[] = field === 'ageRange' ? AGE_RANGES : READING_STATUSES;
    const labels: Record<string, string> =
      field === 'ageRange' ? AGE_RANGE_LABELS : READING_STATUS_LABELS;
    const rows = await this.db.getAllAsync<{ key: string | null; n: number }>(
      `SELECT ${column} AS key, COUNT(*) AS n FROM books
       GROUP BY ${column}
       ORDER BY ${column} IS NULL, ${caseOrder(column, values)}`,
      [],
    );
    return rows.map((r) => ({
      key: r.key,
      label: r.key === null ? 'Non indicata' : (labels[r.key] ?? r.key),
      count: r.n,
    }));
  }

  async bulkUpsert(books: Book[], strategy: 'replace' | 'keep'): Promise<ImportResult> {
    const result: ImportResult = { inserted: 0, replaced: 0, skipped: 0 };
    await this.db.withTransactionAsync(async () => {
      for (const incoming of books) {
        const normalized = normalizeNewBook(incoming);
        const existing =
          (await this.findById(incoming.id)) ??
          (normalized.isbn ? await this.findByIsbn(normalized.isbn) : null);

        if (!existing) {
          const book: Book = {
            ...normalized,
            id: incoming.id || newId(),
            createdAt: incoming.createdAt || nowIso(),
            updatedAt: incoming.updatedAt || nowIso(),
          };
          await this.assertIsbnFree(book.isbn, null);
          await this.insertRow(book);
          await this.syncTags(book.id, book.tags);
          result.inserted++;
        } else if (strategy === 'replace') {
          // La copertina locale non viaggia nell'export: si conserva quella esistente.
          const merged: NewBook = {
            ...normalized,
            coverPath: normalized.coverPath ?? existing.coverPath,
          };
          await this.assertIsbnFree(merged.isbn, existing.id);
          await this.updateRow(existing.id, merged, incoming.updatedAt || nowIso());
          await this.syncTags(existing.id, merged.tags);
          result.replaced++;
        } else {
          result.skipped++;
        }
      }
    });
    return result;
  }

  // ---- interni -------------------------------------------------------------

  private async mustFind(id: string): Promise<Book> {
    const book = await this.findById(id);
    if (!book) throw new NotFoundError('Libro', id);
    return book;
  }

  private async assertIsbnFree(isbn: string | null, selfId: string | null): Promise<void> {
    if (!isbn) return;
    const row = await this.db.getFirstAsync<{ id: string }>('SELECT id FROM books WHERE isbn = ?', [
      isbn,
    ]);
    if (row && row.id !== selfId) throw new DuplicateIsbnError(isbn, row.id);
  }

  private async insertRow(book: Book): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO books (id, isbn, title, authors, publisher, published_year, page_count,
         description, cover_path, status, rating, notes, started_at, finished_at,
         age_range, book_type_id, created_at, updated_at)
       VALUES (${placeholders(18)})`,
      [
        book.id,
        book.isbn,
        book.title,
        JSON.stringify(book.authors),
        book.publisher,
        book.publishedYear,
        book.pageCount,
        book.description,
        book.coverPath,
        book.status,
        book.rating,
        book.notes,
        book.startedAt,
        book.finishedAt,
        book.ageRange,
        book.bookTypeId,
        book.createdAt,
        book.updatedAt,
      ],
    );
  }

  private async updateRow(id: string, book: NewBook, updatedAt: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE books SET isbn = ?, title = ?, authors = ?, publisher = ?, published_year = ?,
         page_count = ?, description = ?, cover_path = ?, status = ?, rating = ?, notes = ?,
         started_at = ?, finished_at = ?, age_range = ?, book_type_id = ?, updated_at = ?
       WHERE id = ?`,
      [
        book.isbn,
        book.title,
        JSON.stringify(book.authors),
        book.publisher,
        book.publishedYear,
        book.pageCount,
        book.description,
        book.coverPath,
        book.status,
        book.rating,
        book.notes,
        book.startedAt,
        book.finishedAt,
        book.ageRange,
        book.bookTypeId,
        updatedAt,
        id,
      ],
    );
  }

  /** Allinea `book_tags` ai nomi dati, creando i tag mancanti. Da chiamare in transazione. */
  private async syncTags(bookId: string, names: string[]): Promise<void> {
    await this.db.runAsync('DELETE FROM book_tags WHERE book_id = ?', [bookId]);
    for (const name of names) {
      await this.db.runAsync('INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)', [
        newId(),
        name,
        nowIso(),
      ]);
      await this.db.runAsync(
        'INSERT OR IGNORE INTO book_tags (book_id, tag_id) SELECT ?, id FROM tags WHERE name = ?',
        [bookId, name],
      );
    }
  }
}

// ---- mapping e validazione --------------------------------------------------

function toBook(row: BookRow): Book {
  return {
    id: row.id,
    isbn: row.isbn,
    title: row.title,
    authors: parseAuthors(row.authors),
    publisher: row.publisher,
    publishedYear: row.published_year,
    pageCount: row.page_count,
    description: row.description,
    coverPath: row.cover_path,
    status: row.status as ReadingStatus,
    rating: (row.rating as Rating | null) ?? null,
    notes: row.notes,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    ageRange: (row.age_range as AgeRange | null) ?? null,
    bookTypeId: row.book_type_id,
    tags: row.tag_names ? row.tag_names.split(TAG_SEP) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseAuthors(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((a): a is string => typeof a === 'string') : [];
  } catch {
    return [];
  }
}

/** Valida e normalizza i campi prima della scrittura. */
export function normalizeNewBook(input: NewBook): NewBook {
  const title = input.title?.trim() ?? '';
  if (!title) throw new ValidationError('Il titolo è obbligatorio');

  let isbn: string | null = null;
  if (input.isbn) {
    isbn = normalizeIsbn(input.isbn);
    if (!isbn) throw new InvalidIsbnError(input.isbn);
  }
  if (!READING_STATUSES.includes(input.status)) {
    throw new ValidationError(`Stato non valido: ${String(input.status)}`);
  }
  if (input.ageRange !== null && !AGE_RANGES.includes(input.ageRange)) {
    throw new ValidationError(`Fascia d'età non valida: ${String(input.ageRange)}`);
  }
  if (input.rating !== null && (input.rating < 1 || input.rating > 5)) {
    throw new ValidationError(`Valutazione non valida: ${String(input.rating)}`);
  }

  return {
    isbn,
    title,
    authors: (input.authors ?? []).map((a) => a.trim()).filter(Boolean),
    publisher: emptyToNull(input.publisher),
    publishedYear: input.publishedYear ?? null,
    pageCount: input.pageCount ?? null,
    description: emptyToNull(input.description),
    coverPath: input.coverPath ?? null,
    status: input.status,
    rating: input.rating ?? null,
    notes: emptyToNull(input.notes),
    startedAt: input.startedAt ?? null,
    finishedAt: input.finishedAt ?? null,
    ageRange: input.ageRange ?? null,
    bookTypeId: emptyToNull(input.bookTypeId),
    tags: normalizeTagList(input.tags ?? []),
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}
