import { OpenLibraryProvider } from '../OpenLibraryProvider';
import { fakeFetch, ISBN, jsonResponse, OPENLIBRARY_RESPONSE } from './fixtures';

describe('OpenLibraryProvider', () => {
  it('mappa la risposta in BookMetadata', async () => {
    const fetchFn = fakeFetch({
      'openlibrary.org': async () => jsonResponse(OPENLIBRARY_RESPONSE),
    });
    const meta = await new OpenLibraryProvider(fetchFn).lookupByIsbn(ISBN);
    expect(fetchFn.calls).toEqual([
      `https://openlibrary.org/api/books?bibkeys=ISBN:${ISBN}&format=json&jscmd=data`,
    ]);
    expect(meta).toEqual({
      isbn: ISBN,
      title: 'Fantastic Mr. Fox',
      authors: ['Roald Dahl'],
      publisher: 'Puffin Books',
      publishedYear: 2007,
      pageCount: 96,
      coverUrl: 'https://covers.openlibrary.org/b/id/8739161-L.jpg',
      source: 'open_library',
      suggestedTags: ['foxes', 'juvenile fiction', 'farmers', 'fiction'],
    });
  });

  it('restituisce null se la chiave ISBN manca (risposta vuota {})', async () => {
    const provider = new OpenLibraryProvider(
      fakeFetch({ 'openlibrary.org': async () => jsonResponse({}) }),
    );
    expect(await provider.lookupByIsbn(ISBN)).toBeNull();
  });

  it('senza campo cover non inventa una copertina', async () => {
    const provider = new OpenLibraryProvider(
      fakeFetch({
        'openlibrary.org': async () => jsonResponse({ [`ISBN:${ISBN}`]: { title: 'T' } }),
      }),
    );
    const meta = await provider.lookupByIsbn(ISBN);
    expect(meta?.coverUrl).toBeUndefined();
    expect(meta?.authors).toEqual([]);
  });

  it('lancia su errore HTTP', async () => {
    const provider = new OpenLibraryProvider(
      fakeFetch({ 'openlibrary.org': async () => jsonResponse({}, 503) }),
    );
    await expect(provider.lookupByIsbn(ISBN)).rejects.toThrow('HTTP 503');
  });
});
