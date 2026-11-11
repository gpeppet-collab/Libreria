import { normalizeIsbn } from '@/domain/isbn';

import {
  METADATA_LOOKUP_TIMEOUT_MS,
  type BookMetadata,
  type MetadataProvider,
  type MetadataService,
  type MetadataSource,
} from './MetadataProvider';

export interface MetadataServiceOptions {
  /** Provider in ordine di preferenza. */
  providers: MetadataProvider[];
  /** Se restituisce false il lookup non parte. Default: sempre online. */
  isOnline?: () => Promise<boolean>;
  /** Timeout complessivo su tutti i provider. */
  timeoutMs?: number;
  /** Notifica degli errori ignorati (log). */
  onError?: (source: MetadataSource | 'network', error: unknown) => void;
}

/**
 * Interroga i provider in sequenza e restituisce il primo risultato.
 * Non lancia mai: errori di rete, timeout e risposte malformate producono `null`.
 */
export class FallbackMetadataService implements MetadataService {
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

  async lookup(rawIsbn: string): Promise<BookMetadata | null> {
    const isbn = normalizeIsbn(rawIsbn);
    if (!isbn) return null;

    try {
      if (!(await this.isOnline())) return null;
    } catch (err) {
      this.onError('network', err);
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      for (const provider of this.providers) {
        if (controller.signal.aborted) break;
        try {
          const result = await withAbort(
            provider.lookupByIsbn(isbn, controller.signal),
            controller.signal,
          );
          if (result) return { ...result, isbn };
        } catch (err) {
          this.onError(provider.source, err);
          if (controller.signal.aborted) break;
        }
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
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
