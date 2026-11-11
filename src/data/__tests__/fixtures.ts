import type { NewBook } from '@/domain/types';

export function newBook(overrides: Partial<NewBook> = {}): NewBook {
  return {
    isbn: null,
    title: 'Titolo di prova',
    authors: ['Autore Prova'],
    publisher: null,
    publishedYear: null,
    pageCount: null,
    description: null,
    coverPath: null,
    status: 'da_leggere',
    rating: null,
    notes: null,
    startedAt: null,
    finishedAt: null,
    ageRange: null,
    bookTypeId: null,
    tags: [],
    ...overrides,
  };
}

/** ISBN-13 validi per i test. */
export const ISBN_A = '9780306406157';
export const ISBN_B = '9780140328721';
export const ISBN_C = '9788804668930';
