import { normalizeIsbn } from './isbn';
import { normalizeTagList } from './tags';
import {
  AGE_RANGES,
  READING_STATUSES,
  type AgeRange,
  type Book,
  type BookType,
  type Rating,
  type ReadingStatus,
} from './types';

/**
 * Formato del file di export/import (RF8, RF9).
 * Versionato: ogni modifica incompatibile incrementa `version` e aggiunge un convertitore.
 * Tipo e tag sono esportati per nome, così il file resta leggibile e indipendente dagli id.
 */
export const EXPORT_FORMAT = 'libreria-export' as const;
export const EXPORT_VERSION = 1 as const;
export const EXPORT_MIME_TYPE = 'application/json';

export type ExportedBook = Omit<Book, 'coverPath' | 'bookTypeId'> & {
  /** Nome del tipo, oppure null. */
  bookType: string | null;
  /** Copertina in base64 (JPEG/PNG), opzionale. */
  coverBase64?: string;
};

export interface LibraryExport {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  /** Inclusi i tipi creati dall'utente. */
  bookTypes: BookType[];
  books: ExportedBook[];
}

/** Strategia di unione in import quando un libro esiste già (stesso id o stesso ISBN). */
export type ImportStrategy = 'replace' | 'keep';

export class ExportFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportFormatError';
  }
}

/** Nome del file di export per una data. */
export function exportFileName(date: Date): string {
  return `libreria-${date.toISOString().slice(0, 10)}.json`;
}

/** Controllo strutturale minimo. Per la validazione completa usare `parseLibraryExport`. */
export function isLibraryExport(value: unknown): value is LibraryExport {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.format === EXPORT_FORMAT &&
    v.version === EXPORT_VERSION &&
    Array.isArray(v.books) &&
    Array.isArray(v.bookTypes)
  );
}

/** Costruisce il documento di export. `covers` mappa bookId → base64 per le copertine da includere. */
export function buildLibraryExport(
  books: readonly Book[],
  bookTypes: readonly BookType[],
  covers: Readonly<Record<string, string>> = {},
  now: Date = new Date(),
): LibraryExport {
  const typeNameById = new Map(bookTypes.map((t) => [t.id, t.name]));
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    bookTypes: bookTypes.map((t) => ({ ...t })),
    books: books.map((b) => bookToExported(b, typeNameById, covers[b.id])),
  };
}

export function bookToExported(
  book: Book,
  typeNameById: ReadonlyMap<string, string>,
  coverBase64?: string,
): ExportedBook {
  const { coverPath: _cover, bookTypeId, ...rest } = book;
  const exported: ExportedBook = {
    ...rest,
    bookType: bookTypeId ? (typeNameById.get(bookTypeId) ?? null) : null,
  };
  if (coverBase64) exported.coverBase64 = coverBase64;
  return exported;
}

/**
 * Valida e normalizza un documento JSON già parsato. Tollerante sui campi opzionali
 * (valori mancanti o non validi diventano null/default), rigido su formato, versione,
 * `id` e `title` di ogni libro.
 */
export function parseLibraryExport(value: unknown): LibraryExport {
  if (typeof value !== 'object' || value === null) {
    throw new ExportFormatError('Il file non contiene un documento JSON valido');
  }
  const v = value as Record<string, unknown>;
  if (v.format !== EXPORT_FORMAT) {
    throw new ExportFormatError('Il file non è un export di Libreria');
  }
  if (v.version !== EXPORT_VERSION) {
    throw new ExportFormatError(`Versione del file non supportata: ${String(v.version)}`);
  }
  if (!Array.isArray(v.books)) throw new ExportFormatError('Elenco libri mancante');

  const bookTypes = Array.isArray(v.bookTypes)
    ? v.bookTypes.flatMap((t): BookType[] => {
        const r = t as Record<string, unknown>;
        const id = str(r.id);
        const name = str(r.name);
        return id && name
          ? [{ id, name, builtin: r.builtin === true, sortOrder: num(r.sortOrder) ?? 0 }]
          : [];
      })
    : [];

  const books = v.books.map((b, i) => parseExportedBook(b, i));
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: str(v.exportedAt) ?? new Date(0).toISOString(),
    bookTypes,
    books,
  };
}

function parseExportedBook(value: unknown, index: number): ExportedBook {
  if (typeof value !== 'object' || value === null) {
    throw new ExportFormatError(`Libro n. ${index + 1} non valido`);
  }
  const r = value as Record<string, unknown>;
  const id = str(r.id);
  const title = str(r.title);
  if (!id || !title) {
    throw new ExportFormatError(`Libro n. ${index + 1}: id o titolo mancante`);
  }
  const status = str(r.status);
  const ageRange = str(r.ageRange);
  const rating = num(r.rating);
  const exported: ExportedBook = {
    id,
    isbn: r.isbn == null ? null : normalizeIsbn(String(r.isbn)),
    title,
    authors: Array.isArray(r.authors)
      ? r.authors.filter((a): a is string => typeof a === 'string')
      : [],
    publisher: str(r.publisher) ?? null,
    publishedYear: num(r.publishedYear) ?? null,
    pageCount: num(r.pageCount) ?? null,
    description: str(r.description) ?? null,
    status:
      status && READING_STATUSES.includes(status as ReadingStatus)
        ? (status as ReadingStatus)
        : 'da_leggere',
    rating:
      rating !== undefined && rating >= 1 && rating <= 5 && Number.isInteger(rating)
        ? (rating as Rating)
        : null,
    notes: str(r.notes) ?? null,
    startedAt: str(r.startedAt) ?? null,
    finishedAt: str(r.finishedAt) ?? null,
    ageRange: ageRange && AGE_RANGES.includes(ageRange as AgeRange) ? (ageRange as AgeRange) : null,
    bookType: str(r.bookType) ?? null,
    tags: normalizeTagList(
      Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string') : [],
    ),
    createdAt: str(r.createdAt) ?? '',
    updatedAt: str(r.updatedAt) ?? '',
  };
  const cover = str(r.coverBase64);
  if (cover) exported.coverBase64 = cover;
  return exported;
}

/** Converte un libro esportato in `Book` risolvendo il tipo per nome (case-insensitive). */
export function exportedToBook(
  exported: ExportedBook,
  typeIdByName: ReadonlyMap<string, string>,
): Book {
  const { bookType, coverBase64: _cover, ...rest } = exported;
  return {
    ...rest,
    coverPath: null,
    bookTypeId: bookType ? (typeIdByName.get(bookType.toLocaleLowerCase('it-IT')) ?? null) : null,
  };
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
