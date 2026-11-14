import { GoogleBooksProvider } from '../GoogleBooksProvider';
import type { BookSearchResult } from '../MetadataProvider';
import { dedupeResults, MergingMetadataService } from '../MetadataService';
import { OpenLibraryProvider } from '../OpenLibraryProvider';
import { SbnProvider } from '../SbnProvider';
import { fakeFetch, jsonResponse } from './fixtures';

const GOOGLE_SEARCH = {
  items: [
    {
      volumeInfo: {
        title: 'Il Gruffalò',
        authors: ['Julia Donaldson'],
        publisher: 'Emme',
        publishedDate: '2014',
        industryIdentifiers: [{ type: 'ISBN_13', identifier: '9788867142323' }],
        imageLinks: { thumbnail: 'http://books.google.com/g.jpg' },
        categories: ['Juvenile Fiction'],
      },
    },
    { volumeInfo: { title: 'Gruffalò e la sua piccolina', authors: ['Julia Donaldson'] } },
    { volumeInfo: { authors: ['Senza titolo'] } },
  ],
};
const SBN_SEARCH = {
  briefRecords: [
    {
      titolo: 'Il Gruffalò / Julia Donaldson ; illustrato da Axel Scheffler',
      autorePrincipale: 'Donaldson, Julia',
      pubblicazione: 'San Dorligo della Valle : Emme, 2014',
      isbn: '978-88-6714-232-3',
    },
    {
      titolo: 'Il Gruffalò : libro sonoro / Julia Donaldson',
      autorePrincipale: 'Donaldson, Julia',
      pubblicazione: 'Trieste : Emme, 2019',
    },
  ],
};
const OL_SEARCH = {
  docs: [
    {
      title: 'The Gruffalo',
      author_name: ['Julia Donaldson'],
      isbn: ['0333710932', '9788879271820'],
      first_publish_year: 1999,
      number_of_pages_median: 32,
      cover_i: 12345,
    },
    { author_name: ['Senza titolo'] },
  ],
};

describe('ricerca per titolo: provider', () => {
  it('Google Books: codifica il testo, chiede 10 risultati e scarta le voci senza titolo', async () => {
    const fetchFn = fakeFetch({ 'googleapis.com': async () => jsonResponse(GOOGLE_SEARCH) });
    const results = await new GoogleBooksProvider({ fetchFn }).searchByText('il gruffalò');
    expect(fetchFn.calls).toEqual([
      'https://www.googleapis.com/books/v1/volumes?q=il%20gruffal%C3%B2&country=IT&maxResults=10',
    ]);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      isbn: '9788867142323',
      title: 'Il Gruffalò',
      publisher: 'Emme',
      publishedYear: 2014,
      coverUrl: 'https://books.google.com/g.jpg',
      source: 'google_books',
    });
    expect(results[1]).toMatchObject({ isbn: null, title: 'Gruffalò e la sua piccolina' });
  });

  it('OPAC SBN: interpreta i record e normalizza l ISBN quando c è', async () => {
    const fetchFn = fakeFetch({ 'opac.sbn.it': async () => jsonResponse(SBN_SEARCH) });
    const results = await new SbnProvider(fetchFn).searchByText('il gruffalò');
    expect(fetchFn.calls[0]).toBe(
      'https://opac.sbn.it/opacmobilegw/search.json?any=il%20gruffal%C3%B2&type=0&start=0&rows=10',
    );
    expect(results).toEqual([
      {
        isbn: '9788867142323',
        title: 'Il Gruffalò',
        authors: ['Julia Donaldson'],
        publisher: 'Emme',
        publishedYear: 2014,
        coverUrl: undefined,
        source: 'sbn',
      },
      {
        isbn: null,
        title: 'Il Gruffalò: libro sonoro',
        authors: ['Julia Donaldson'],
        publisher: 'Emme',
        publishedYear: 2019,
        coverUrl: undefined,
        source: 'sbn',
      },
    ]);
  });

  it('Open Library: preferisce l ISBN di un edizione italiana e costruisce la copertina', async () => {
    const fetchFn = fakeFetch({ 'openlibrary.org': async () => jsonResponse(OL_SEARCH) });
    const results = await new OpenLibraryProvider(fetchFn).searchByText('gruffalo');
    expect(fetchFn.calls[0]).toContain(
      'https://openlibrary.org/search.json?q=gruffalo&limit=10&fields=',
    );
    expect(results).toEqual([
      {
        isbn: '9788879271820',
        title: 'The Gruffalo',
        authors: ['Julia Donaldson'],
        publisher: undefined,
        publishedYear: 1999,
        pageCount: 32,
        coverUrl: 'https://covers.openlibrary.org/b/id/12345-L.jpg',
        source: 'open_library',
      },
    ]);
  });
});

describe('ricerca per titolo: servizio', () => {
  const build = (fetchFn: ReturnType<typeof fakeFetch>) =>
    new MergingMetadataService({
      providers: [
        new GoogleBooksProvider({ fetchFn }),
        new SbnProvider(fetchFn),
        new OpenLibraryProvider(fetchFn),
      ],
    });

  it('unisce le fonti, fonde i doppioni per ISBN e riporta gli esiti', async () => {
    const fetchFn = fakeFetch({
      'googleapis.com': async () => jsonResponse(GOOGLE_SEARCH),
      'opac.sbn.it': async () => jsonResponse(SBN_SEARCH),
      'openlibrary.org': async () => jsonResponse({}, 500),
    });
    const svc = build(fetchFn);
    const { results, outcomes, offline } = await svc.searchByText('  il   gruffalò ');
    expect(offline).toBe(false);
    expect(outcomes).toEqual([
      { source: 'google_books', status: 'found' },
      { source: 'sbn', status: 'found' },
      { source: 'open_library', status: 'error' },
    ]);
    expect(results.map((r) => r.title)).toEqual([
      'Il Gruffalò',
      'Gruffalò e la sua piccolina',
      'Il Gruffalò: libro sonoro',
    ]);
    expect(results[0]).toMatchObject({ isbn: '9788867142323', source: 'google_books' });
    expect(svc.coverUrlsFor(results[0]!)).toEqual([
      'https://books.google.com/g.jpg',
      'https://covers.openlibrary.org/b/isbn/9788867142323-L.jpg?default=false',
    ]);
    expect(svc.coverUrlsFor(results[1]!)).toEqual([]);
  });

  it('testo troppo corto o telefono offline: nessuna richiesta', async () => {
    const fetchFn = fakeFetch({});
    expect(await build(fetchFn).searchByText(' ab ')).toEqual({
      results: [],
      outcomes: [],
      offline: false,
    });
    const offline = new MergingMetadataService({
      providers: [new SbnProvider(fetchFn)],
      isOnline: async () => false,
    });
    expect(await offline.searchByText('gruffalò')).toEqual({
      results: [],
      outcomes: [],
      offline: true,
    });
    expect(fetchFn.calls).toHaveLength(0);
  });

  it('dedupeResults: stesso titolo e autore senza ISBN in comune si fondono riempiendo i campi', () => {
    const a: BookSearchResult = {
      isbn: null,
      title: 'Il Gruffalò',
      authors: ['Julia Donaldson'],
      source: 'google_books',
    };
    const b: BookSearchResult = {
      isbn: '9788867142323',
      title: 'il gruffalò!',
      authors: ['Julia Donaldson'],
      publisher: 'Emme',
      coverUrl: 'https://x/c.jpg',
      source: 'sbn',
    };
    const c: BookSearchResult = {
      isbn: '9780000000002',
      title: 'Il Gruffalò',
      authors: ['Julia Donaldson'],
      source: 'open_library',
    };
    expect(dedupeResults([a, b, c])).toEqual([
      {
        isbn: '9788867142323',
        title: 'Il Gruffalò',
        authors: ['Julia Donaldson'],
        publisher: 'Emme',
        coverUrl: 'https://x/c.jpg',
        source: 'google_books',
        suggestedTags: [],
      },
      c,
    ]);
  });
});
