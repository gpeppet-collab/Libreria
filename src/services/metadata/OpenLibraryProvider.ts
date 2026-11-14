import { normalizeIsbn } from '@/domain/isbn';

import {
  METADATA_ENDPOINTS,
  QuotaExceededError,
  type BookMetadata,
  type BookSearchResult,
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

/** Forma (parziale) di una voce di `api/books?...&jscmd=data`. */
interface OpenLibraryBook {
  title?: unknown;
  subtitle?: unknown;
  authors?: { name?: unknown }[];
  publishers?: { name?: unknown }[];
  publish_date?: unknown;
  number_of_pages?: unknown;
  cover?: { large?: unknown; medium?: unknown; small?: unknown };
  subjects?: { name?: unknown }[];
}

export class OpenLibraryProvider implements MetadataProvider {
  readonly source = 'open_library' as const;

  constructor(private readonly fetchFn: FetchFn = (input, init) => fetch(input, init)) {}

  async lookupByIsbn(isbn: string, signal?: AbortSignal): Promise<BookMetadata | null> {
    const res = await this.fetchFn(METADATA_ENDPOINTS.openLibrary(isbn), { signal });
    if (res.status === 429) throw new QuotaExceededError(this.source);
    if (!res.ok) throw new Error(`Open Library HTTP ${res.status}`);
    const body = (await res.json()) as Record<string, OpenLibraryBook | undefined>;
    const entry = body[`ISBN:${isbn}`];
    if (!entry) return null;

    const title = asString(entry.title);
    if (!title) return null;
    const subtitle = asString(entry.subtitle);
    const names = (list?: { name?: unknown }[]) =>
      (list ?? []).map((x) => asString(x.name)).filter((s): s is string => s !== undefined);
    const cover = entry.cover ?? {};

    return {
      isbn,
      title: subtitle ? `${title}: ${subtitle}` : title,
      authors: names(entry.authors),
      publisher: names(entry.publishers)[0],
      publishedYear: extractYear(entry.publish_date),
      pageCount: asPositiveInt(entry.number_of_pages),
      coverUrl: cleanCoverUrl(cover.large ?? cover.medium ?? cover.small),
      source: this.source,
      suggestedTags: categoriesToTags(names(entry.subjects)),
    };
  }

  async searchByText(text: string, signal?: AbortSignal): Promise<BookSearchResult[]> {
    const res = await this.fetchFn(METADATA_ENDPOINTS.openLibrarySearch(text), { signal });
    if (res.status === 429) throw new QuotaExceededError(this.source);
    if (!res.ok) throw new Error(`Open Library HTTP ${res.status}`);
    const body = (await res.json()) as { docs?: Record<string, unknown>[] };
    return (body.docs ?? []).flatMap((doc): BookSearchResult[] => {
      const title = asString(doc.title);
      if (!title) return [];
      // Tra gli ISBN dell'opera si preferisce un'edizione italiana (prefisso 97888 / 97912).
      const isbns = asStringArray(doc.isbn).flatMap((v) => normalizeIsbn(v) ?? []);
      const isbn = isbns.find((v) => /^978(88)|^97912/.test(v)) ?? isbns[0] ?? null;
      const coverId = typeof doc.cover_i === 'number' ? doc.cover_i : null;
      return [
        {
          isbn,
          title,
          authors: asStringArray(doc.author_name),
          publisher: asStringArray(doc.publisher)[0],
          publishedYear: asPositiveInt(doc.first_publish_year),
          pageCount: asPositiveInt(doc.number_of_pages_median),
          coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined,
          source: this.source,
        },
      ];
    });
  }
}
