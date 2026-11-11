import { GoogleBooksProvider } from '../GoogleBooksProvider';
import type { BookMetadata, MetadataProvider } from '../MetadataProvider';
import { FallbackMetadataService } from '../MetadataService';
import { OpenLibraryProvider } from '../OpenLibraryProvider';
import { metadataToBookFields } from '../toBook';
import {
  fakeFetch,
  GOOGLE_EMPTY,
  GOOGLE_RESPONSE,
  ISBN,
  jsonResponse,
  OPENLIBRARY_RESPONSE,
} from './fixtures';

function service(
  fetchFn: ReturnType<typeof fakeFetch>,
  extra: Partial<ConstructorParameters<typeof FallbackMetadataService>[0]> = {},
) {
  return new FallbackMetadataService({
    providers: [new GoogleBooksProvider(fetchFn), new OpenLibraryProvider(fetchFn)],
    ...extra,
  });
}

describe('FallbackMetadataService', () => {
  it('usa Google Books quando risponde e non interroga Open Library', async () => {
    const fetchFn = fakeFetch({ 'googleapis.com': async () => jsonResponse(GOOGLE_RESPONSE) });
    const meta = await service(fetchFn).lookup('0-14-032872-6'); // ISBN-10, viene normalizzato
    expect(meta?.source).toBe('google_books');
    expect(meta?.isbn).toBe(ISBN);
    expect(fetchFn.calls).toHaveLength(1);
  });

  it('passa a Open Library se Google non trova nulla o fallisce', async () => {
    const notFound = fakeFetch({
      'googleapis.com': async () => jsonResponse(GOOGLE_EMPTY),
      'openlibrary.org': async () => jsonResponse(OPENLIBRARY_RESPONSE),
    });
    expect((await service(notFound).lookup(ISBN))?.source).toBe('open_library');

    const errors: string[] = [];
    const failing = fakeFetch({
      'googleapis.com': async () => jsonResponse({}, 500),
      'openlibrary.org': async () => jsonResponse(OPENLIBRARY_RESPONSE),
    });
    const meta = await service(failing, { onError: (s) => errors.push(s) }).lookup(ISBN);
    expect(meta?.source).toBe('open_library');
    expect(errors).toEqual(['google_books']);
  });

  it('restituisce null, senza lanciare, se tutti falliscono, se offline o se l ISBN non è valido', async () => {
    const failing = fakeFetch({
      'googleapis.com': async () => {
        throw new Error('rete');
      },
      'openlibrary.org': async () => {
        throw new Error('rete');
      },
    });
    expect(await service(failing).lookup(ISBN)).toBeNull();
    expect(failing.calls).toHaveLength(2);

    const offline = fakeFetch({ 'googleapis.com': async () => jsonResponse(GOOGLE_RESPONSE) });
    expect(await service(offline, { isOnline: async () => false }).lookup(ISBN)).toBeNull();
    expect(offline.calls).toHaveLength(0);

    const broken = fakeFetch({ 'googleapis.com': async () => jsonResponse(GOOGLE_RESPONSE) });
    expect(
      await service(broken, {
        isOnline: async () => {
          throw new Error('netinfo');
        },
      }).lookup(ISBN),
    ).toBeNull();

    expect(await service(fakeFetch({})).lookup('abc')).toBeNull();
  });

  it('rispetta il timeout complessivo anche se un provider non risponde', async () => {
    const hanging: MetadataProvider = {
      source: 'google_books',
      lookupByIsbn: () => new Promise<BookMetadata | null>(() => {}),
    };
    const never = { source: 'open_library' as const, lookupByIsbn: jest.fn(async () => null) };
    const svc = new FallbackMetadataService({ providers: [hanging, never], timeoutMs: 20 });
    const start = Date.now();
    expect(await svc.lookup(ISBN)).toBeNull();
    expect(Date.now() - start).toBeLessThan(1000);
    expect(never.lookupByIsbn).not.toHaveBeenCalled();
  });
});

describe('metadataToBookFields', () => {
  it('precompila solo i campi bibliografici', () => {
    const fields = metadataToBookFields({
      isbn: ISBN,
      title: 'T',
      authors: ['A'],
      source: 'google_books',
      suggestedTags: ['x'],
    });
    expect(fields).toEqual({
      isbn: ISBN,
      title: 'T',
      authors: ['A'],
      publisher: null,
      publishedYear: null,
      pageCount: null,
      description: null,
    });
    expect('tags' in fields).toBe(false);
  });
});
