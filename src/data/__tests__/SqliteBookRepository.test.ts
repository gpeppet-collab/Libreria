import type { Book } from '@/domain/types';

import { DuplicateIsbnError, InvalidIsbnError, NotFoundError, ValidationError } from '../errors';
import { createRepositories, type Repositories } from '../repositories';
import { ISBN_A, ISBN_B, ISBN_C, newBook } from './fixtures';
import { createTestDatabase, type NodeSqliteDatabase } from './nodeSqlite';

let db: NodeSqliteDatabase;
let repos: Repositories;
const removed: Book[] = [];

beforeEach(async () => {
  db = await createTestDatabase();
  removed.length = 0;
  repos = createRepositories(db, {
    onBookRemoved: async (b) => {
      removed.push(b);
    },
  });
});
afterEach(() => db.close());

describe('SqliteBookRepository.create', () => {
  it('salva un libro con tag e lo rilegge', async () => {
    const book = await repos.books.create(
      newBook({
        isbn: '0-306-40615-2',
        title: '  Il mio libro ',
        authors: ['Anna', ' Bruno '],
        ageRange: '3-5',
        bookTypeId: 'albo_illustrato',
        tags: ['Animali', 'animali', 'Buonanotte'],
        rating: 4,
      }),
    );
    expect(book.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(book.isbn).toBe(ISBN_A);
    expect(book.title).toBe('Il mio libro');
    expect(book.authors).toEqual(['Anna', 'Bruno']);
    expect(book.tags).toEqual(['animali', 'buonanotte']);
    expect(book.ageRange).toBe('3-5');
    expect(book.bookTypeId).toBe('albo_illustrato');
    expect(book.rating).toBe(4);
    expect(book.createdAt).toBe(book.updatedAt);

    const again = await repos.books.findById(book.id);
    expect(again).toEqual(book);
    expect(await repos.books.findByIsbn('0306406152')).toEqual(book);
    expect(await repos.books.count()).toBe(1);
  });

  it('rifiuta titolo vuoto, ISBN non valido e ISBN duplicato', async () => {
    await expect(repos.books.create(newBook({ title: '  ' }))).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(repos.books.create(newBook({ isbn: '123' }))).rejects.toBeInstanceOf(
      InvalidIsbnError,
    );

    const first = await repos.books.create(newBook({ isbn: ISBN_A }));
    const err = await repos.books.create(newBook({ isbn: ISBN_A })).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DuplicateIsbnError);
    expect((err as DuplicateIsbnError).existingBookId).toBe(first.id);
    expect(await repos.books.count()).toBe(1);
  });

  it('rifiuta un tipo di libro inesistente (vincolo di chiave esterna)', async () => {
    await expect(repos.books.create(newBook({ bookTypeId: 'non_esiste' }))).rejects.toThrow();
    expect(await repos.books.count()).toBe(0);
  });
});

describe('SqliteBookRepository.findAll', () => {
  beforeEach(async () => {
    await repos.books.create(
      newBook({
        title: 'Dinosauri a colori',
        authors: ['Zoe Verdi'],
        ageRange: '3-5',
        bookTypeId: 'albo_illustrato',
        tags: ['dinosauri', 'animali'],
        status: 'letto',
        isbn: ISBN_A,
      }),
    );
    await repos.books.create(
      newBook({
        title: 'Buonanotte luna',
        authors: ['Mario Rossi'],
        ageRange: '0-2',
        bookTypeId: 'cartonato',
        tags: ['buonanotte', 'animali'],
        status: 'in_lettura',
      }),
    );
    await repos.books.create(
      newBook({
        title: 'Avventure spaziali',
        authors: ['Anna Bianchi'],
        ageRange: '9-12',
        bookTypeId: 'romanzo_ragazzi',
        tags: ['spazio'],
        status: 'da_leggere',
        isbn: ISBN_B,
      }),
    );
    await repos.books.create(newBook({ title: 'Senza classificazione', authors: [] }));
  });

  it('ordina per titolo di default', async () => {
    const titles = (await repos.books.findAll()).map((b) => b.title);
    expect(titles).toEqual([
      'Avventure spaziali',
      'Buonanotte luna',
      'Dinosauri a colori',
      'Senza classificazione',
    ]);
  });

  it('cerca nel titolo, negli autori e nell ISBN', async () => {
    expect((await repos.books.findAll({ text: 'DINO' })).map((b) => b.title)).toEqual([
      'Dinosauri a colori',
    ]);
    expect((await repos.books.findAll({ text: 'rossi' })).map((b) => b.title)).toEqual([
      'Buonanotte luna',
    ]);
    expect((await repos.books.findAll({ text: ISBN_B.slice(3, 9) })).map((b) => b.title)).toEqual([
      'Avventure spaziali',
    ]);
    expect(await repos.books.findAll({ text: '%' })).toHaveLength(0); // il jolly viene escapato
  });

  it('filtra per stato, fascia d età e tipo', async () => {
    expect((await repos.books.findAll({ status: 'letto' })).map((b) => b.title)).toEqual([
      'Dinosauri a colori',
    ]);
    expect((await repos.books.findAll({ ageRange: '0-2' })).map((b) => b.title)).toEqual([
      'Buonanotte luna',
    ]);
    expect(
      (await repos.books.findAll({ bookTypeId: 'romanzo_ragazzi' })).map((b) => b.title),
    ).toEqual(['Avventure spaziali']);
  });

  it('filtra per tag in AND', async () => {
    expect((await repos.books.findAll({ tags: ['animali'] })).map((b) => b.title)).toEqual([
      'Buonanotte luna',
      'Dinosauri a colori',
    ]);
    expect(
      (await repos.books.findAll({ tags: ['Animali', 'dinosauri'] })).map((b) => b.title),
    ).toEqual(['Dinosauri a colori']);
    expect(await repos.books.findAll({ tags: ['animali', 'spazio'] })).toHaveLength(0);
  });

  it('combina filtri e ordina per autore e per fascia d età', async () => {
    expect(
      (await repos.books.findAll({ ageRange: '3-5', tags: ['animali'] })).map((b) => b.title),
    ).toEqual(['Dinosauri a colori']);

    const byAuthor = (await repos.books.findAll({ sort: 'author' })).map(
      (b) => b.authors[0] ?? null,
    );
    expect(byAuthor).toEqual([null, 'Anna Bianchi', 'Mario Rossi', 'Zoe Verdi']);

    const byAge = (await repos.books.findAll({ sort: 'ageRange' })).map((b) => b.ageRange);
    expect(byAge).toEqual(['0-2', '3-5', '9-12', null]);

    const byAgeDesc = (await repos.books.findAll({ sort: 'ageRange', direction: 'desc' })).map(
      (b) => b.ageRange,
    );
    expect(byAgeDesc).toEqual([null, '9-12', '3-5', '0-2']);
  });
});

describe('SqliteBookRepository.update / remove', () => {
  it('aggiorna i campi e i tag, aggiornando updatedAt', async () => {
    const book = await repos.books.create(newBook({ tags: ['a', 'b'] }));
    await new Promise((r) => setTimeout(r, 2));
    const updated = await repos.books.update(book.id, {
      status: 'letto',
      rating: 5,
      tags: ['b', 'c'],
      notes: ' bello ',
    });
    expect(updated.status).toBe('letto');
    expect(updated.rating).toBe(5);
    expect(updated.tags).toEqual(['b', 'c']);
    expect(updated.notes).toBe('bello');
    expect(updated.title).toBe(book.title);
    expect(updated.updatedAt > book.updatedAt).toBe(true);

    // Senza `tags` nel patch, i tag restano invariati.
    const again = await repos.books.update(book.id, { title: 'Nuovo titolo' });
    expect(again.tags).toEqual(['b', 'c']);
  });

  it('impedisce di assegnare un ISBN già usato da un altro libro', async () => {
    await repos.books.create(newBook({ isbn: ISBN_A }));
    const other = await repos.books.create(newBook({ isbn: ISBN_B }));
    await expect(repos.books.update(other.id, { isbn: ISBN_A })).rejects.toBeInstanceOf(
      DuplicateIsbnError,
    );
    // Riassegnare il proprio ISBN è permesso.
    await expect(repos.books.update(other.id, { isbn: ISBN_B })).resolves.toBeDefined();
  });

  it('solleva NotFoundError su id inesistente', async () => {
    await expect(repos.books.update('nope', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(repos.books.remove('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('elimina il libro, le associazioni ai tag e notifica il callback', async () => {
    const book = await repos.books.create(newBook({ tags: ['x'], coverPath: '/covers/1.jpg' }));
    await repos.books.remove(book.id);
    expect(await repos.books.findById(book.id)).toBeNull();
    expect(removed.map((b) => b.coverPath)).toEqual(['/covers/1.jpg']);
    const links = await db.getAllAsync('SELECT * FROM book_tags', []);
    expect(links).toHaveLength(0);
    // Il tag resta disponibile per l'autocompletamento.
    expect((await repos.tags.findAll()).map((t) => t.name)).toEqual(['x']);
  });
});

describe('SqliteBookRepository.countBy', () => {
  beforeEach(async () => {
    await repos.books.create(
      newBook({ ageRange: '3-5', bookTypeId: 'albo_illustrato', status: 'letto' }),
    );
    await repos.books.create(
      newBook({ ageRange: '3-5', bookTypeId: 'albo_illustrato', status: 'letto' }),
    );
    await repos.books.create(newBook({ ageRange: '0-2', bookTypeId: 'cartonato' }));
    await repos.books.create(newBook());
  });

  it('conta per fascia d età nell ordine della lista, con "non indicata" in coda', async () => {
    expect(await repos.books.countBy('ageRange')).toEqual([
      { key: '0-2', label: '0-2 anni', count: 1 },
      { key: '3-5', label: '3-5 anni', count: 2 },
      { key: null, label: 'Non indicata', count: 1 },
    ]);
  });

  it('conta per tipo con il nome del tipo', async () => {
    expect(await repos.books.countBy('bookType')).toEqual([
      { key: 'albo_illustrato', label: 'Albo illustrato', count: 2 },
      { key: 'cartonato', label: 'Libro cartonato', count: 1 },
      { key: null, label: 'Non indicato', count: 1 },
    ]);
  });

  it('conta per stato', async () => {
    expect(await repos.books.countBy('status')).toEqual([
      { key: 'da_leggere', label: 'Da leggere', count: 2 },
      { key: 'letto', label: 'Letto', count: 2 },
    ]);
  });
});

describe('SqliteBookRepository.bulkUpsert', () => {
  function asBook(partial: Partial<Book> & { id: string }): Book {
    return {
      ...newBook(),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      ...partial,
    };
  }

  it('inserisce i nuovi, sostituisce o salta gli esistenti per id o ISBN', async () => {
    const existing = await repos.books.create(
      newBook({ isbn: ISBN_A, title: 'Vecchio', coverPath: '/covers/a.jpg', tags: ['vecchio'] }),
    );
    const byIsbn = await repos.books.create(newBook({ isbn: ISBN_B, title: 'Per ISBN' }));

    const incoming: Book[] = [
      asBook({
        id: existing.id,
        isbn: ISBN_A,
        title: 'Nuovo titolo',
        tags: ['nuovo'],
        coverPath: null,
      }),
      asBook({ id: 'altro-id', isbn: ISBN_B, title: 'Match per ISBN', status: 'letto' }),
      asBook({ id: 'id-nuovo', isbn: ISBN_C, title: 'Mai visto', tags: ['fresco'] }),
    ];

    const kept = await repos.books.bulkUpsert(incoming, 'keep');
    expect(kept).toEqual({ inserted: 1, replaced: 0, skipped: 2 });
    expect((await repos.books.findById(existing.id))?.title).toBe('Vecchio');
    expect((await repos.books.findById('id-nuovo'))?.tags).toEqual(['fresco']);
    expect((await repos.books.findById('id-nuovo'))?.createdAt).toBe('2026-01-01T00:00:00.000Z');

    const replaced = await repos.books.bulkUpsert(incoming, 'replace');
    expect(replaced).toEqual({ inserted: 0, replaced: 3, skipped: 0 });
    const a = await repos.books.findById(existing.id);
    expect(a?.title).toBe('Nuovo titolo');
    expect(a?.tags).toEqual(['nuovo']);
    expect(a?.coverPath).toBe('/covers/a.jpg'); // conservata
    const b = await repos.books.findById(byIsbn.id);
    expect(b?.title).toBe('Match per ISBN');
    expect(b?.status).toBe('letto');
    expect(await repos.books.findById('altro-id')).toBeNull();
    expect(await repos.books.count()).toBe(3);
  });

  it('è atomico: un errore annulla tutto', async () => {
    const incoming: Book[] = [asBook({ id: 'ok', title: 'Ok' }), asBook({ id: 'ko', title: '' })];
    await expect(repos.books.bulkUpsert(incoming, 'replace')).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await repos.books.count()).toBe(0);
  });
});
