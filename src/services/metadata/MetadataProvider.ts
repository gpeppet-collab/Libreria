/**
 * Recupero metadati online da ISBN (RF3, RF15). Sempre best-effort:
 * nessun errore di rete deve arrivare alla UI come eccezione.
 */
export type MetadataSource = 'google_books' | 'open_library';

export interface BookMetadata {
  /** ISBN-13 normalizzato. */
  isbn: string;
  title: string;
  authors: string[];
  publisher?: string;
  publishedYear?: number;
  pageCount?: number;
  description?: string;
  /** URL https della copertina, se disponibile. */
  coverUrl?: string;
  source: MetadataSource;
  /** Da `categories` (Google Books) o `subjects` (Open Library): solo proposte, mai applicati in automatico. */
  suggestedTags?: string[];
}

/** Firma di `fetch`, iniettabile nei test. */
export type FetchFn = (input: string, init?: { signal?: AbortSignal }) => Promise<FetchResponse>;
export interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface MetadataProvider {
  readonly source: MetadataSource;
  /**
   * Restituisce null se il libro non è noto al provider.
   * Può lanciare per errori di rete o risposte HTTP non valide: è il servizio a gestirli.
   */
  lookupByIsbn(isbn: string, signal?: AbortSignal): Promise<BookMetadata | null>;
}

export interface MetadataService {
  /**
   * Prova i provider in ordine (Google Books, poi Open Library) con timeout complessivo.
   * Restituisce null se l'ISBN non è valido, se offline, se nessun provider risponde
   * o se il libro non è noto. Non lancia mai.
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
