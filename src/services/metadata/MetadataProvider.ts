/**
 * Recupero metadati online da ISBN (RF3, RF15). Sempre best-effort:
 * nessun errore di rete deve arrivare alla UI come eccezione.
 */
export type MetadataSource = 'google_books' | 'open_library';

export interface BookMetadata {
  isbn: string;
  title: string;
  authors: string[];
  publisher?: string;
  publishedYear?: number;
  pageCount?: number;
  description?: string;
  coverUrl?: string;
  source: MetadataSource;
  /** Da `categories` (Google Books) o `subjects` (Open Library): solo proposte, mai applicati in automatico. */
  suggestedTags?: string[];
}

export interface MetadataProvider {
  readonly source: MetadataSource;
  /** Restituisce null se non trovato. Può lanciare per errori di rete: è il servizio a gestirli. */
  lookupByIsbn(isbn: string, signal?: AbortSignal): Promise<BookMetadata | null>;
}

export interface MetadataService {
  /**
   * Prova i provider in ordine (Google Books, poi Open Library) con timeout complessivo.
   * Restituisce null se offline, se nessun provider risponde o se il libro non è noto.
   */
  lookup(isbn: string): Promise<BookMetadata | null>;
}

export const METADATA_LOOKUP_TIMEOUT_MS = 5000;

/** Endpoint usati (sola lettura, nessuna chiave). Verso questi host viaggia solo l'ISBN. */
export const METADATA_ENDPOINTS = {
  googleBooks: (isbn: string) => `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
  openLibrary: (isbn: string) =>
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  openLibraryCover: (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
} as const;
