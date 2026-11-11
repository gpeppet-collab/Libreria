import type { Book, BookType } from './types';

/**
 * Formato del file di export/import (RF8, RF9).
 * Versionato: ogni modifica incompatibile incrementa `version` e aggiunge un convertitore.
 * Tipo e tag sono esportati per nome, così il file resta leggibile e indipendente dagli id.
 */
export const EXPORT_FORMAT = 'libreria-export' as const;
export const EXPORT_VERSION = 1 as const;

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

/** Controllo strutturale minimo prima dell'import. Non valida ogni campo. */
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
