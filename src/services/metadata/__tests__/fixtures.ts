import type { FetchFn, FetchResponse } from '../MetadataProvider';

export const ISBN = '9780140328721';

/** Risposta realistica (ridotta) di Google Books per un libro per bambini. */
export const GOOGLE_RESPONSE = {
  kind: 'books#volumes',
  totalItems: 1,
  items: [
    {
      volumeInfo: {
        title: 'Fantastic Mr Fox',
        authors: ['Roald Dahl'],
        publisher: 'Puffin',
        publishedDate: '2007-09-06',
        description: 'Boggis, Bunce and Bean are just about the nastiest farmers you could meet.',
        industryIdentifiers: [{ type: 'ISBN_13', identifier: ISBN }],
        pageCount: 96,
        categories: ['Juvenile Fiction / Animals / Foxes', 'Juvenile Fiction'],
        imageLinks: {
          smallThumbnail:
            'http://books.google.com/books/content?id=abc&img=1&zoom=5&edge=curl&source=gbs_api',
          thumbnail:
            'http://books.google.com/books/content?id=abc&img=1&zoom=1&edge=curl&source=gbs_api',
        },
      },
    },
  ],
};

export const GOOGLE_EMPTY = { kind: 'books#volumes', totalItems: 0 };

/** Risposta realistica (ridotta) di Open Library con jscmd=data. */
export const OPENLIBRARY_RESPONSE = {
  [`ISBN:${ISBN}`]: {
    title: 'Fantastic Mr. Fox',
    authors: [{ url: 'https://openlibrary.org/authors/OL34184A/Roald_Dahl', name: 'Roald Dahl' }],
    publishers: [{ name: 'Puffin Books' }],
    publish_date: 'September 6, 2007',
    number_of_pages: 96,
    cover: {
      small: 'https://covers.openlibrary.org/b/id/8739161-S.jpg',
      medium: 'https://covers.openlibrary.org/b/id/8739161-M.jpg',
      large: 'https://covers.openlibrary.org/b/id/8739161-L.jpg',
    },
    subjects: [
      { name: 'Foxes', url: 'https://openlibrary.org/subjects/foxes' },
      { name: 'Juvenile fiction', url: 'https://openlibrary.org/subjects/juvenile_fiction' },
      { name: 'Farmers -- Fiction', url: 'https://openlibrary.org/subjects/farmers' },
    ],
  },
};

export function jsonResponse(body: unknown, status = 200): FetchResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/** fetch finto che risponde in base all'host dell'URL e registra le chiamate. */
export function fakeFetch(
  handlers: Partial<
    Record<'googleapis.com' | 'openlibrary.org', (url: string) => Promise<FetchResponse>>
  >,
): FetchFn & { calls: string[] } {
  const calls: string[] = [];
  const fn: FetchFn = async (url, init) => {
    calls.push(url);
    if (init?.signal?.aborted) throw new Error('aborted');
    const host = (Object.keys(handlers) as (keyof typeof handlers)[]).find((h) => url.includes(h));
    const handler = host ? handlers[host] : undefined;
    if (!handler) throw new Error(`nessun handler per ${url}`);
    return handler(url);
  };
  return Object.assign(fn, { calls });
}
