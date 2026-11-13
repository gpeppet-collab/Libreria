import { GoogleBooksProvider } from '../GoogleBooksProvider';
import type { BookMetadata, MetadataProvider } from '../MetadataProvider';
import { MergingMetadataService, type MetadataServiceOptions } from '../MetadataService';
import { OpenLibraryProvider } from '../OpenLibraryProvider';
import { SbnProvider } from '../SbnProvider';
import { metadataToBookFields } from '../toBook';
import {
  fakeFetch,
  GOOGLE_EMPTY,
  GOOGLE_RESPONSE,
  ISBN,
  jsonResponse,
  OPENLIBRARY_RESPONSE,
  SBN_RESPONSE,
} from './fixtures';

const OL_COVER_GUESS = `https://covers.openlibrary.org/b/isbn/${ISBN}-L.jpg?default=false`;

function service(
  fetchFn: ReturnType<typeof fakeFetch>,
  extra: Partial<MetadataServiceOptions> = {},
) {
  return new MergingMetadataService({
    providers: [
      new GoogleBooksProvider({ fetchFn }),
      new SbnProvider(fetchFn),
      new OpenLibraryProvider(fetchFn),
    ],
    ...extra,
  });
}

describe('MergingMetadataService', () => {
  it('interroga tutte le fonti e unisce: la prima che trova fa da base, le altre riempiono', async () => {
    const fetchFn = fakeFetch({
      'googleapis.com': async () => jsonResponse(GOOGLE_EMPTY),
      'opac.sbn.it': async () => jsonResponse(SBN_RESPONSE),
      'openlibrary.org': async () => jsonResponse(OPENLIBRARY_RESPONSE),
    });
    const result = await service(fetchFn).lookupDetailed('0-14-032872-6'); // ISBN-10, viene normalizzato
    expect(result.offline).toBe(false);
    expect(result.outcomes).toEqual([
      { source: 'google_books', status: 'not_found' },
      { source: 'sbn', status: 'found' },
      { source: 'open_library', status: 'found' },
    ]);
    expect(result.metadata).toEqual({
      isbn: ISBN,
      title: 'Furbo, il signor Volpe', // da SBN (base)
      authors: ['Roald Dahl'],
      publisher: 'Salani',
      publishedYear: 2016,
      pageCount: 96, // da Open Library
      description: undefined,
      coverUrl: 'https://covers.openlibrary.org/b/id/8739161-L.jpg', // da Open Library
      source: 'sbn',
      suggestedTags: ['foxes', 'juvenile fiction', 'farmers', 'fiction'],
    });
    expect(result.coverUrls).toEqual([
      'https://covers.openlibrary.org/b/id/8739161-L.jpg',
      OL_COVER_GUESS,
    ]);
  });

  it('con Google disponibile usa Google come base e mette la sua copertina per prima', async () => {
    const fetchFn = fakeFetch({
      'googleapis.com': async () => jsonResponse(GOOGLE_RESPONSE),
      'opac.sbn.it': async () => jsonResponse({ briefRecords: [] }),
      'openlibrary.org': async () => jsonResponse(OPENLIBRARY_RESPONSE),
    });
    const result = await service(fetchFn).lookupDetailed(ISBN);
    expect(result.metadata?.source).toBe('google_books');
    expect(result.metadata?.title).toBe('Fantastic Mr Fox');
    expect(result.coverUrls).toEqual([
      'https://books.google.com/books/content?id=abc&img=1&zoom=1&source=gbs_api',
      'https://covers.openlibrary.org/b/id/8739161-L.jpg',
      OL_COVER_GUESS,
    ]);
    expect(await service(fetchFn).lookup(ISBN)).toEqual(result.metadata);
  });

  it('riporta quota, errori e non trovato per fonte, senza lanciare', async () => {
    const errors: string[] = [];
    const fetchFn = fakeFetch({
      'googleapis.com': async () => jsonResponse({}, 429),
      'opac.sbn.it': async () => {
        throw new Error('rete');
      },
      'openlibrary.org': async () => jsonResponse({}),
    });
    const result = await service(fetchFn, { onError: (s) => errors.push(s) }).lookupDetailed(ISBN);
    expect(result.metadata).toBeNull();
    expect(result.coverUrls).toEqual([]);
    expect(result.outcomes).toEqual([
      { source: 'google_books', status: 'quota' },
      { source: 'sbn', status: 'error' },
      { source: 'open_library', status: 'not_found' },
    ]);
    expect(errors.sort()).toEqual(['google_books', 'sbn']);
  });

  it('offline non interroga nessuno; ISBN non valido dà risultato vuoto; stato rete ignoto prova comunque', async () => {
    const fetchFn = fakeFetch({ 'googleapis.com': async () => jsonResponse(GOOGLE_RESPONSE) });
    const offline = await service(fetchFn, { isOnline: async () => false }).lookupDetailed(ISBN);
    expect(offline).toEqual({ metadata: null, coverUrls: [], outcomes: [], offline: true });
    expect(fetchFn.calls).toHaveLength(0);

    expect(await service(fetchFn).lookupDetailed('abc')).toEqual({
      metadata: null,
      coverUrls: [],
      outcomes: [],
      offline: false,
    });

    const unknown = await service(fetchFn, {
      isOnline: async () => {
        throw new Error('netinfo');
      },
    }).lookupDetailed(ISBN);
    expect(unknown.metadata?.source).toBe('google_books');
  });

  it('rispetta il timeout: chi non risponde è "timeout", chi ha risposto conta', async () => {
    const hanging: MetadataProvider = {
      source: 'google_books',
      lookupByIsbn: () => new Promise<BookMetadata | null>(() => {}),
    };
    const quick: MetadataProvider = {
      source: 'sbn',
      lookupByIsbn: async (isbn) => ({ isbn, title: 'Veloce', authors: [], source: 'sbn' }),
    };
    const svc = new MergingMetadataService({ providers: [hanging, quick], timeoutMs: 20 });
    const start = Date.now();
    const result = await svc.lookupDetailed(ISBN);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(result.metadata?.title).toBe('Veloce');
    expect(result.outcomes).toEqual([
      { source: 'google_books', status: 'timeout' },
      { source: 'sbn', status: 'found' },
    ]);
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
