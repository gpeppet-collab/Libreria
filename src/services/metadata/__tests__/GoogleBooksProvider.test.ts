import { GoogleBooksProvider } from '../GoogleBooksProvider';
import { fakeFetch, GOOGLE_EMPTY, GOOGLE_RESPONSE, ISBN, jsonResponse } from './fixtures';

describe('GoogleBooksProvider', () => {
  it('mappa la risposta in BookMetadata', async () => {
    const fetchFn = fakeFetch({ 'googleapis.com': async () => jsonResponse(GOOGLE_RESPONSE) });
    const meta = await new GoogleBooksProvider(fetchFn).lookupByIsbn(ISBN);
    expect(fetchFn.calls).toEqual([`https://www.googleapis.com/books/v1/volumes?q=isbn:${ISBN}`]);
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

  it('restituisce null se non ci sono risultati o manca il titolo', async () => {
    const empty = new GoogleBooksProvider(
      fakeFetch({ 'googleapis.com': async () => jsonResponse(GOOGLE_EMPTY) }),
    );
    expect(await empty.lookupByIsbn(ISBN)).toBeNull();
    const noTitle = new GoogleBooksProvider(
      fakeFetch({
        'googleapis.com': async () => jsonResponse({ items: [{ volumeInfo: { authors: ['X'] } }] }),
      }),
    );
    expect(await noTitle.lookupByIsbn(ISBN)).toBeNull();
  });

  it('tollera campi mancanti e concatena il sottotitolo', async () => {
    const provider = new GoogleBooksProvider(
      fakeFetch({
        'googleapis.com': async () =>
          jsonResponse({
            items: [{ volumeInfo: { title: 'Solo', subtitle: 'titolo', pageCount: 0 } }],
          }),
      }),
    );
    expect(await provider.lookupByIsbn(ISBN)).toEqual({
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

  it('lancia su errore HTTP', async () => {
    const provider = new GoogleBooksProvider(
      fakeFetch({ 'googleapis.com': async () => jsonResponse({}, 429) }),
    );
    await expect(provider.lookupByIsbn(ISBN)).rejects.toThrow('HTTP 429');
  });
});
