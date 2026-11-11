import { BUILTIN_BOOK_TYPES } from '@/domain/bookTypes';

import { BuiltinTypeError, DuplicateNameError, NotFoundError, ValidationError } from '../errors';
import { createRepositories, type Repositories } from '../repositories';
import { SqliteBookTypeRepository } from '../SqliteBookTypeRepository';
import { newBook } from './fixtures';
import { createTestDatabase, type NodeSqliteDatabase } from './nodeSqlite';

let db: NodeSqliteDatabase;
let repos: Repositories;
let types: SqliteBookTypeRepository;

beforeEach(async () => {
  db = await createTestDatabase();
  repos = createRepositories(db);
  types = repos.bookTypes as SqliteBookTypeRepository;
});
afterEach(() => db.close());

describe('SqliteBookTypeRepository', () => {
  it('elenca i tipi predefiniti nell ordine previsto', async () => {
    const all = await types.findAll();
    expect(all.map((t) => t.id)).toEqual(BUILTIN_BOOK_TYPES.map((t) => t.id));
    expect(all.every((t) => t.builtin)).toBe(true);
  });

  it('crea tipi personalizzati prima di "Altro" e dopo i predefiniti', async () => {
    const a = await types.create('  Libro  pop-up ');
    const b = await types.create('Audiolibro');
    expect(a).toEqual({
      id: expect.any(String),
      name: 'Libro pop-up',
      builtin: false,
      sortOrder: 510,
    });
    expect(b.sortOrder).toBe(520);
    const ids = (await types.findAll()).map((t) => t.id);
    expect(ids.indexOf(a.id)).toBeGreaterThan(ids.indexOf('saggio'));
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf('altro'));
    expect(await types.findByName('libro POP-UP')).toEqual(a);
  });

  it('rifiuta nomi vuoti o duplicati (case-insensitive)', async () => {
    await expect(types.create(' ')).rejects.toBeInstanceOf(ValidationError);
    const err = await types.create('albo ILLUSTRATO').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DuplicateNameError);
    expect((err as DuplicateNameError).existingId).toBe('albo_illustrato');
  });

  it('rinomina, anche i predefiniti, senza creare duplicati', async () => {
    const renamed = await types.rename('fiaba', 'Fiabe e favole');
    expect(renamed.name).toBe('Fiabe e favole');
    expect(renamed.builtin).toBe(true);
    await expect(types.rename('fiaba', 'Fumetto')).rejects.toBeInstanceOf(DuplicateNameError);
    await expect(types.rename('fiaba', 'Fiabe e favole')).resolves.toBeDefined();
    await expect(types.rename('nope', 'x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('non elimina i predefiniti; eliminando un tipo utente i libri restano senza tipo', async () => {
    await expect(types.remove('altro')).rejects.toBeInstanceOf(BuiltinTypeError);
    await expect(types.remove('nope')).rejects.toBeInstanceOf(NotFoundError);

    const custom = await types.create('Pop-up');
    const book = await repos.books.create(newBook({ bookTypeId: custom.id }));
    await types.remove(custom.id);
    expect((await repos.books.findById(book.id))?.bookTypeId).toBeNull();
    expect((await types.findAll()).some((t) => t.id === custom.id)).toBe(false);
  });
});
