/**
 * Recupero metadati online da ISBN (RF3, RF15). Sempre best-effort:
 * nessun errore di rete deve arrivare alla UI come eccezione.
 */
export type MetadataSource = 'google_books' | 'open_library' | 'sbn';

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
  /** Fonte principale (quella che ha fornito il titolo). */
  source: MetadataSource;
  /** Da categorie/soggetti: solo proposte, mai applicati in automatico. */
  suggestedTags?: string[];
}

/** Firma di `fetch`, iniettabile nei test. */
export type FetchFn = (input: string, init?: { signal?: AbortSignal }) => Promise<FetchResponse>;
export interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

/** Il provider ha rifiutato per limite di richieste (es. quota anonima di Google Books). */
export class QuotaExceededError extends Error {
  constructor(source: MetadataSource) {
    super(`Quota esaurita: ${source}`);
    this.name = 'QuotaExceededError';
  }
}

export interface MetadataProvider {
  readonly source: MetadataSource;
  /**
   * Restituisce null se il libro non è noto al provider.
   * Può lanciare per errori di rete o risposte HTTP non valide: è il servizio a gestirli.
   */
  lookupByIsbn(isbn: string, signal?: AbortSignal): Promise<BookMetadata | null>;
}

export type LookupStatus = 'found' | 'not_found' | 'quota' | 'error' | 'timeout';

export interface ProviderOutcome {
  source: MetadataSource;
  status: LookupStatus;
}

export interface LookupResult {
  /** Dati uniti da tutte le fonti che hanno trovato il libro, oppure null. */
  metadata: BookMetadata | null;
  /** Copertine candidate in ordine di preferenza: si scarica la prima che funziona. */
  coverUrls: string[];
  /** Esito per fonte, per spiegare all'utente cosa è successo. */
  outcomes: ProviderOutcome[];
  /** true se la ricerca non è partita perché il telefono risulta senza rete. */
  offline: boolean;
}

export interface MetadataService {
  /** Come `lookupDetailed`, ma restituisce solo i dati. Non lancia mai. */
  lookup(isbn: string): Promise<BookMetadata | null>;
  /**
   * Interroga tutte le fonti in parallelo entro un timeout complessivo e unisce i risultati:
   * la prima fonte (in ordine di preferenza) che trova il libro fa da base, le altre
   * riempiono i campi mancanti. Non lancia mai.
   */
  lookupDetailed(isbn: string): Promise<LookupResult>;
}

export const METADATA_LOOKUP_TIMEOUT_MS = 10000;

/** Endpoint usati (sola lettura). Verso questi host viaggia solo l'ISBN (più l'eventuale chiave Google). */
export const METADATA_ENDPOINTS = {
  googleBooks: (query: string, apiKey?: string | null) =>
    `https://www.googleapis.com/books/v1/volumes?q=${query}&country=IT` +
    (apiKey ? `&key=${encodeURIComponent(apiKey)}` : ''),
  openLibrary: (isbn: string) =>
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  /** `default=false`: risponde 404 se la copertina non esiste, invece di un'immagine vuota. */
  openLibraryCover: (isbn: string) =>
    `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,
  /** Catalogo del Servizio Bibliotecario Nazionale (buona copertura dei libri italiani). */
  sbn: (isbn: string) => `https://opac.sbn.it/opacmobilegw/search.json?isbn=${isbn}`,
} as const;
