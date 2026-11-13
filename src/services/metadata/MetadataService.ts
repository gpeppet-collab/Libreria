import { normalizeIsbn } from '@/domain/isbn';
import { normalizeTagList } from '@/domain/tags';

import {
  METADATA_ENDPOINTS,
  METADATA_LOOKUP_TIMEOUT_MS,
  QuotaExceededError,
  type BookMetadata,
  type LookupResult,
  type LookupStatus,
  type MetadataProvider,
  type MetadataService,
  type MetadataSource,
  type ProviderOutcome,
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
}

/** La prima voce fa da base; le successive riempiono solo i campi mancanti. */
export function mergeMetadata(isbn: string, found: BookMetadata[]): BookMetadata | null {
  const [base, ...others] = found;
  if (!base) return null;
  const merged: BookMetadata = { ...base, isbn, authors: [...base.authors] };
  for (const o of others) {
    if (merged.authors.length === 0) merged.authors = [...o.authors];
    merged.publisher ??= o.publisher;
    merged.publishedYear ??= o.publishedYear;
    merged.pageCount ??= o.pageCount;
    merged.description ??= o.description;
    merged.coverUrl ??= o.coverUrl;
  }
  merged.suggestedTags = normalizeTagList(found.flatMap((m) => m.suggestedTags ?? [])).slice(
    0,
    MAX_SUGGESTED_TAGS,
  );
  return merged;
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
