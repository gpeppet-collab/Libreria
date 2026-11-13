import { GoogleBooksProvider } from '../GoogleBooksProvider';
import { QuotaExceededError } from '../MetadataProvider';
import { fakeFetch, GOOGLE_EMPTY, GOOGLE_RESPONSE, ISBN, jsonResponse } from './fixtures';

const BASE = 'https://www.googleapis.com/books/v1/volumes';

describe('GoogleBooksProvider', () => {
  it('mappa la risposta in BookMetadata', async () => {
    const fetchFn = fakeFetch({ 'googleapis.com': async () => jsonResponse(GOOGLE_RESPONSE) });
    const meta = await new GoogleBooksProvider({ fetchFn }).lookupByIsbn(ISBN);
    expect(fetchFn.calls).toEqual([`${BASE}?q=isbn:${ISBN}&country=IT`]);
    expect(meta).toEqual({
      isbn: ISBN,
      title: 'Fantastic Mr Fox',
      authors: ['Roald Dahl'],
      publisher: 'Puffin',
      publishedYear: 2007,
      pageCount: 96,
      description: 'Boggis, Bunce and Bean are just about the nastiest farmers you could meet.',
      coverUrl: 'https://books.google.com/books/content?id=abc&img=1&zoom=1&source=gbs_api',
      source: 'google_books',
      suggestedTags: ['juvenile fiction', 'animals', 'foxes'],
    });
  });

  it('aggiunge la chiave API quando è configurata', async () => {
    const fetchFn = fakeFetch({ 'googleapis.com': async () => jsonResponse(GOOGLE_RESPONSE) });
    await new GoogleBooksProvider({ fetchFn, getApiKey: async () => 'AB c' }).lookupByIsbn(ISBN);
    expect(fetchFn.calls).toEqual([`${BASE}?q=isbn:${ISBN}&country=IT&key=AB%20c`]);
  });

  it('se la ricerca per ISBN è vuota riprova con il numero come testo e accetta solo lo stesso ISBN', async () => {
    const other = {
      volumeInfo: {
        title: 'Altro libro',
        industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780306406157' }],
      },
    };
    const right = {
      volumeInfo: {
        title: 'Quello giusto',
        industryIdentifiers: [{ type: 'ISBN_10', identifier: '0140328726' }],
      },
    };
    const fetchFn = fakeFetch({
      'googleapis.com': async (url) =>
        jsonResponse(url.includes('q=isbn:') ? GOOGLE_EMPTY : { items: [other, right] }),
    });
    const meta = await new GoogleBooksProvider({ fetchFn }).lookupByIsbn(ISBN);
    expect(fetchFn.calls).toEqual([
      `${BASE}?q=isbn:${ISBN}&country=IT`,
      `${BASE}?q=${ISBN}&country=IT`,
    ]);
    expect(meta?.title).toBe('Quello giusto');

    const onlyOther = fakeFetch({
      'googleapis.com': async (url) =>
        jsonResponse(url.includes('q=isbn:') ? GOOGLE_EMPTY : { items: [other] }),
    });
    expect(await new GoogleBooksProvider({ fetchFn: onlyOther }).lookupByIsbn(ISBN)).toBeNull();
  });

  it('restituisce null se manca il titolo; tollera campi mancanti e concatena il sottotitolo', async () => {
    const noTitle = fakeFetch({
      'googleapis.com': async () => jsonResponse({ items: [{ volumeInfo: { authors: ['X'] } }] }),
    });
    expect(await new GoogleBooksProvider({ fetchFn: noTitle }).lookupByIsbn(ISBN)).toBeNull();

    const sparse = fakeFetch({
      'googleapis.com': async () =>
        jsonResponse({
          items: [{ volumeInfo: { title: 'Solo', subtitle: 'titolo', pageCount: 0 } }],
        }),
    });
    expect(await new GoogleBooksProvider({ fetchFn: sparse }).lookupByIsbn(ISBN)).toEqual({
      isbn: ISBN,
      title: 'Solo: titolo',
      authors: [],
      publisher: undefined,
      publishedYear: undefined,
      pageCount: undefined,
      description: undefined,
      coverUrl: undefined,
      source: 'google_books',
      suggestedTags: [],
    });
  });

  it('segnala la quota esaurita (429/403) e gli altri errori HTTP', async () => {
    for (const status of [429, 403]) {
      const p = new GoogleBooksProvider({
        fetchFn: fakeFetch({ 'googleapis.com': async () => jsonResponse({}, status) }),
      });
      await expect(p.lookupByIsbn(ISBN)).rejects.toBeInstanceOf(QuotaExceededError);
    }
    const p = new GoogleBooksProvider({
      fetchFn: fakeFetch({ 'googleapis.com': async () => jsonResponse({}, 500) }),
    });
    await expect(p.lookupByIsbn(ISBN)).rejects.toThrow('HTTP 500');
  });
});
