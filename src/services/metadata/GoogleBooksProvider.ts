import {
  METADATA_ENDPOINTS,
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

/** Forma (parziale) della risposta di `volumes?q=isbn:`. */
interface GoogleVolumesResponse {
  totalItems?: number;
  items?: { volumeInfo?: Record<string, unknown> }[];
}

export class GoogleBooksProvider implements MetadataProvider {
  readonly source = 'google_books' as const;

  constructor(private readonly fetchFn: FetchFn = (input, init) => fetch(input, init)) {}

  async lookupByIsbn(isbn: string, signal?: AbortSignal): Promise<BookMetadata | null> {
    const res = await this.fetchFn(METADATA_ENDPOINTS.googleBooks(isbn), { signal });
    if (!res.ok) throw new Error(`Google Books HTTP ${res.status}`);
    const body = (await res.json()) as GoogleVolumesResponse;
    const info = body.items?.[0]?.volumeInfo;
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
}
