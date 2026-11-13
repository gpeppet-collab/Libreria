import { normalizeIsbn } from '@/domain/isbn';

import {
  METADATA_ENDPOINTS,
  QuotaExceededError,
  type BookMetadata,
  type FetchFn,
  type MetadataProvider,
} from './MetadataProvider';
import {
  asPositiveInt,
  asString,
  asStringArray,
  categoriesToTags,
  cleanCoverUrl,
  extractYear,
} from './parsing';

type VolumeInfo = Record<string, unknown>;
interface GoogleVolumesResponse {
  items?: { volumeInfo?: VolumeInfo }[];
}

export interface GoogleBooksOptions {
  fetchFn?: FetchFn;
  /**
   * Chiave API personale (facoltativa). Senza chiave Google usa una quota anonima
   * condivisa tra tutti, spesso esaurita: con la chiave la ricerca è molto più affidabile.
   */
  getApiKey?: () => Promise<string | null>;
}

export class GoogleBooksProvider implements MetadataProvider {
  readonly source = 'google_books' as const;
  private readonly fetchFn: FetchFn;
  private readonly getApiKey: () => Promise<string | null>;

  constructor(options: GoogleBooksOptions = {}) {
    this.fetchFn = options.fetchFn ?? ((input, init) => fetch(input, init));
    this.getApiKey = options.getApiKey ?? (async () => null);
  }

  async lookupByIsbn(isbn: string, signal?: AbortSignal): Promise<BookMetadata | null> {
    const apiKey = await this.getApiKey().catch(() => null);

    // 1) Ricerca precisa per ISBN.
    const exact = await this.query(`isbn:${isbn}`, apiKey, signal);
    let info = exact[0];

    // 2) Alcuni libri non sono indicizzati per ISBN ma compaiono cercando il numero come testo:
    //    si accetta solo un risultato che dichiara proprio questo ISBN.
    if (!info) {
      const loose = await this.query(isbn, apiKey, signal);
      info = loose.find((v) => hasIsbn(v, isbn));
    }
    if (!info) return null;

    const title = asString(info.title);
    if (!title) return null;
    const subtitle = asString(info.subtitle);
    const images = (info.imageLinks ?? {}) as Record<string, unknown>;

    return {
      isbn,
      title: subtitle ? `${title}: ${subtitle}` : title,
      authors: asStringArray(info.authors),
      publisher: asString(info.publisher),
      publishedYear: extractYear(info.publishedDate),
      pageCount: asPositiveInt(info.pageCount),
      description: asString(info.description),
      coverUrl: cleanCoverUrl(images.thumbnail ?? images.smallThumbnail),
      source: this.source,
      suggestedTags: categoriesToTags(asStringArray(info.categories)),
    };
  }

  private async query(
    q: string,
    apiKey: string | null,
    signal?: AbortSignal,
  ): Promise<VolumeInfo[]> {
    const res = await this.fetchFn(METADATA_ENDPOINTS.googleBooks(q, apiKey), { signal });
    if (res.status === 429 || res.status === 403) throw new QuotaExceededError(this.source);
    if (!res.ok) throw new Error(`Google Books HTTP ${res.status}`);
    const body = (await res.json()) as GoogleVolumesResponse;
    return (body.items ?? []).flatMap((i) => (i.volumeInfo ? [i.volumeInfo] : []));
  }
}

function hasIsbn(info: VolumeInfo, isbn: string): boolean {
  const ids = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
  return ids.some((id) => {
    const value = (id as { identifier?: unknown } | null)?.identifier;
    return typeof value === 'string' && normalizeIsbn(value) === isbn;
  });
}
