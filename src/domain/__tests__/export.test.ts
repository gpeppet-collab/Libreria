import { BUILTIN_BOOK_TYPES } from '../bookTypes';
import {
  buildLibraryExport,
  exportedToBook,
  exportFileName,
  ExportFormatError,
  isLibraryExport,
  parseLibraryExport,
} from '../export';
import type { Book } from '../types';

const book: Book = {
  id: 'b1',
  isbn: '9780140328721',
  title: 'Fantastic Mr Fox',
  authors: ['Roald Dahl'],
  publisher: 'Puffin',
  publishedYear: 2007,
  pageCount: 96,
  description: null,
  coverPath: 'file:///covers/b1.jpg',
  status: 'letto',
  rating: 5,
  notes: 'Bellissimo',
  startedAt: null,
  finishedAt: '2026-01-10',
  ageRange: '6-8',
  bookTypeId: 'romanzo_ragazzi',
  tags: ['volpi', 'animali'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-10T00:00:00.000Z',
};

describe('export/import (dominio)', () => {
  it('costruisce il documento con tipo e tag per nome e copertine opzionali', () => {
    const doc = buildLibraryExport(
      [book],
      BUILTIN_BOOK_TYPES,
      { b1: 'AAAA' },
      new Date('2026-02-01T10:00:00Z'),
    );
    expect(doc.format).toBe('libreria-export');
    expect(doc.version).toBe(1);
    expect(doc.exportedAt).toBe('2026-02-01T10:00:00.000Z');
    expect(doc.bookTypes).toHaveLength(BUILTIN_BOOK_TYPES.length);
    expect(doc.books[0]).toEqual({
      ...book,
      coverPath: undefined,
      bookTypeId: undefined,
      bookType: 'Romanzo per ragazzi',
      coverBase64: 'AAAA',
    });
    expect('coverPath' in doc.books[0]!).toBe(false);
    expect(isLibraryExport(doc)).toBe(true);
    expect(isLibraryExport({ format: 'x' })).toBe(false);
  });

  it('fa il giro completo export → JSON → parse → Book', () => {
    const doc = buildLibraryExport([book], BUILTIN_BOOK_TYPES);
    const parsed = parseLibraryExport(JSON.parse(JSON.stringify(doc)));
    expect(parsed).toEqual(doc);
    const typeIdByName = new Map(
      BUILTIN_BOOK_TYPES.map((t) => [t.name.toLocaleLowerCase('it-IT'), t.id]),
    );
    expect(exportedToBook(parsed.books[0]!, typeIdByName)).toEqual({ ...book, coverPath: null });
  });

  it('è tollerante sui campi opzionali non validi', () => {
    const parsed = parseLibraryExport({
      format: 'libreria-export',
      version: 1,
      books: [
        {
          id: 'x',
          title: 'Solo titolo',
          status: 'boh',
          ageRange: '99',
          rating: 9,
          tags: ['A', 'a', 3],
          isbn: '123',
        },
      ],
    });
    expect(parsed.bookTypes).toEqual([]);
    expect(parsed.books[0]).toEqual({
      id: 'x',
      isbn: null,
      title: 'Solo titolo',
      authors: [],
      publisher: null,
      publishedYear: null,
      pageCount: null,
      description: null,
      status: 'da_leggere',
      rating: null,
      notes: null,
      startedAt: null,
      finishedAt: null,
      ageRange: null,
      bookType: null,
      tags: ['a'],
      createdAt: '',
      updatedAt: '',
    });
  });

  it('rifiuta formato, versione o libri non validi', () => {
    expect(() => parseLibraryExport(null)).toThrow(ExportFormatError);
    expect(() => parseLibraryExport({ format: 'altro', version: 1, books: [] })).toThrow(
      'non è un export',
    );
    expect(() => parseLibraryExport({ format: 'libreria-export', version: 2, books: [] })).toThrow(
      'Versione',
    );
    expect(() => parseLibraryExport({ format: 'libreria-export', version: 1 })).toThrow(
      'Elenco libri',
    );
    expect(() =>
      parseLibraryExport({ format: 'libreria-export', version: 1, books: [{ id: 'x' }] }),
    ).toThrow('n. 1');
  });

  it('genera il nome file con la data', () => {
    expect(exportFileName(new Date('2026-03-04T23:59:00Z'))).toBe('libreria-2026-03-04.json');
  });
});
