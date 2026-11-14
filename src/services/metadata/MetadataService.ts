import { normalizeIsbn } from '@/domain/isbn';
import { normalizeTagList } from '@/domain/tags';

import {
  METADATA_ENDPOINTS,
  MAX_SEARCH_RESULTS,
  METADATA_LOOKUP_TIMEOUT_MS,
  QuotaExceededError,
  type BookMetadata,
  type BookSearchResult,
  type LookupResult,
  type LookupStatus,
  type MetadataProvider,
  type MetadataService,
  type MetadataSource,
  type ProviderOutcome,
  type SearchResult,
} from './MetadataProvider';
import { MAX_SUGGESTED_TAGS } from './parsing';

export interface MetadataServiceOptions {
  /** Provider in ordine di preferenza: il primo che trova il libro fa da base. */
  providers: MetadataProvider[];
  /** Se restituisce false il lookup non parte. Default: sempre online. */
  isOnline?: () => Promise<boolean>;
  /** Timeout complessivo su tutti i provider. */
  timeoutMs?: number;
  /** Notifica degli errori ignorati (log). */
  onError?: (source: MetadataSource | 'network', error: unknown) => void;
}

/**
 * Interroga tutti i provider in parallelo e unisce i risultati.
 * Non lancia mai: errori di rete, timeout e risposte malformate diventano esiti per fonte.
 */
export class MergingMetadataService implements MetadataService {
  private readonly providers: MetadataProvider[];
  private readonly isOnline: () => Promise<boolean>;
  private readonly timeoutMs: number;
  private readonly onError: NonNullable<MetadataServiceOptions['onError']>;

  constructor(options: MetadataServiceOptions) {
    this.providers = options.providers;
    this.isOnline = options.isOnline ?? (async () => true);
    this.timeoutMs = options.timeoutMs ?? METADATA_LOOKUP_TIMEOUT_MS;
    this.onError = options.onError ?? (() => {});
  }

  async lookup(isbn: string): Promise<BookMetadata | null> {
    return (await this.lookupDetailed(isbn)).metadata;
  }

  async lookupDetailed(rawIsbn: string): Promise<LookupResult> {
    const empty: LookupResult = { metadata: null, coverUrls: [], outcomes: [], offline: false };
    const isbn = normalizeIsbn(rawIsbn);
    if (!isbn) return empty;

    try {
      if (!(await this.isOnline())) return { ...empty, offline: true };
    } catch (err) {
      // Stato di rete sconosciuto: si prova comunque.
      this.onError('network', err);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const settled = await Promise.all(
        this.providers.map(async (provider) => {
          try {
            const data = await withAbort(
              provider.lookupByIsbn(isbn, controller.signal),
              controller.signal,
            );
            const status: LookupStatus = data ? 'found' : 'not_found';
            return { source: provider.source, status, data };
          } catch (err) {
            const status: LookupStatus = controller.signal.aborted
              ? 'timeout'
              : err instanceof QuotaExceededError
                ? 'quota'
                : 'error';
            if (status !== 'timeout') this.onError(provider.source, err);
            return { source: provider.source, status, data: null };
          }
        }),
      );

      const outcomes: ProviderOutcome[] = settled.map(({ source, status }) => ({ source, status }));
      const found = settled.flatMap((s) => (s.data ? [s.data] : []));
      const metadata = mergeMetadata(isbn, found);
      const coverUrls = metadata
        ? unique([
            ...found.flatMap((m) => (m.coverUrl ? [m.coverUrl] : [])),
            METADATA_ENDPOINTS.openLibraryCover(isbn),
          ])
        : [];
      return { metadata, coverUrls, outcomes, offline: false };
    } finally {
      clearTimeout(timer);
    }
  }

  async searchByText(rawText: string): Promise<SearchResult> {
    const text = rawText.trim().replace(/\s+/g, ' ');
    const empty: SearchResult = { results: [], outcomes: [], offline: false };
    if (text.length < MIN_SEARCH_LENGTH) return empty;

    try {
      if (!(await this.isOnline())) return { ...empty, offline: true };
    } catch (err) {
      this.onError('network', err);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const settled = await Promise.all(
        this.providers.map(async (provider) => {
          try {
            const data = await withAbort(
              provider.searchByText(text, controller.signal),
              controller.signal,
            );
            const status: LookupStatus = data.length ? 'found' : 'not_found';
            return { source: provider.source, status, data };
          } catch (err) {
            const status: LookupStatus = controller.signal.aborted
              ? 'timeout'
              : err instanceof QuotaExceededError
                ? 'quota'
                : 'error';
            if (status !== 'timeout') this.onError(provider.source, err);
            return { source: provider.source, status, data: [] as BookSearchResult[] };
          }
        }),
      );
      return {
        results: dedupeResults(settled.flatMap((s) => s.data)).slice(0, MAX_SEARCH_RESULTS),
        outcomes: settled.map(({ source, status }) => ({ source, status })),
        offline: false,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  coverUrlsFor(result: BookSearchResult): string[] {
    return unique([
      ...(result.coverUrl ? [result.coverUrl] : []),
      ...(result.isbn ? [METADATA_ENDPOINTS.openLibraryCover(result.isbn)] : []),
    ]);
  }
}

export const MIN_SEARCH_LENGTH = 3;

/** Campi mancanti di `base` riempiti da `other`. */
function fill<T extends BookSearchResult | BookMetadata>(
  base: T,
  other: BookSearchResult | BookMetadata,
): void {
  if (base.authors.length === 0) base.authors = [...other.authors];
  base.publisher ??= other.publisher;
  base.publishedYear ??= other.publishedYear;
  base.pageCount ??= other.pageCount;
  base.description ??= other.description;
  base.coverUrl ??= other.coverUrl;
}

/** La prima voce fa da base; le successive riempiono solo i campi mancanti. */
export function mergeMetadata(isbn: string, found: BookMetadata[]): BookMetadata | null {
  const [base, ...others] = found;
  if (!base) return null;
  const merged: BookMetadata = { ...base, isbn, authors: [...base.authors] };
  for (const o of others) fill(merged, o);
  merged.suggestedTags = normalizeTagList(found.flatMap((m) => m.suggestedTags ?? [])).slice(
    0,
    MAX_SUGGESTED_TAGS,
  );
  return merged;
}

/**
 * Unisce i doppioni: stesso ISBN, oppure (senza ISBN in comune) stesso titolo e primo autore.
 * Il primo incontrato fa da base e gli altri ne riempiono i campi mancanti.
 */
export function dedupeResults(results: BookSearchResult[]): BookSearchResult[] {
  const out: BookSearchResult[] = [];
  const key = (r: BookSearchResult) =>
    `${r.title} ${r.authors[0] ?? ''}`
      .toLocaleLowerCase('it-IT')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  for (const r of results) {
    const same = out.find((o) => (r.isbn && o.isbn ? o.isbn === r.isbn : key(o) === key(r)));
    if (!same) {
      out.push({ ...r, authors: [...r.authors] });
      continue;
    }
    same.isbn ??= r.isbn;
    fill(same, r);
    same.suggestedTags = normalizeTagList([
      ...(same.suggestedTags ?? []),
      ...(r.suggestedTags ?? []),
    ]).slice(0, MAX_SUGGESTED_TAGS);
  }
  return out;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/** Risolve/rigetta appena il segnale viene abortito, anche se il provider ignora il segnale. */
function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error('aborted'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error('aborted'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}
