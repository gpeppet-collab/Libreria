import { NotFoundError, ValidationError } from '../errors';
import { createRepositories, type Repositories } from '../repositories';
import { SqliteTagRepository } from '../SqliteTagRepository';
import { newBook } from './fixtures';
import { createTestDatabase, type NodeSqliteDatabase } from './nodeSqlite';

let db: NodeSqliteDatabase;
let repos: Repositories;
let tags: SqliteTagRepository;

beforeEach(async () => {
  db = await createTestDatabase();
  repos = createRepositories(db);
  tags = repos.tags as SqliteTagRepository;
  await repos.books.create(newBook({ title: 'A', tags: ['animali', 'dinosauri'] }));
  await repos.books.create(newBook({ title: 'B', tags: ['animali', 'buonanotte'] }));
  await repos.books.create(newBook({ title: 'C', tags: ['animali'] }));
});
afterEach(() => db.close());

describe('SqliteTagRepository', () => {
  it('elenca i tag con il conteggio dei libri, per nome', async () => {
    expect(await tags.findAll()).toEqual([
      expect.objectContaining({ name: 'animali', bookCount: 3 }),
      expect.objectContaining({ name: 'buonanotte', bookCount: 1 }),
      expect.objectContaining({ name: 'dinosauri', bookCount: 1 }),
    ]);
  });

  it('suggerisce per prefisso, i più usati prima', async () => {
    await tags.ensure('an');
    expect((await tags.suggest(' AN')).map((t) => t.name)).toEqual(['animali', 'an']);
    expect((await tags.suggest('d', 1)).map((t) => t.name)).toEqual(['dinosauri']);
    expect(await tags.suggest('zzz')).toEqual([]);
  });

  it('rinomina un tag', async () => {
    const [animali] = await tags.findAll();
    const renamed = await tags.rename(animali!.id, '  Bestie ');
    expect(renamed).toEqual(
      expect.objectContaining({ id: animali!.id, name: 'bestie', bookCount: 3 }),
    );
    expect((await repos.books.findAll({ text: 'A' }))[0]?.tags).toEqual(['bestie', 'dinosauri']);
  });

  it('rinominando con un nome esistente unisce i due tag', async () => {
    const all = await tags.findAll();
    const buonanotte = all.find((t) => t.name === 'buonanotte')!;
    const dinosauri = all.find((t) => t.name === 'dinosauri')!;
    const merged = await tags.rename(dinosauri.id, 'buonanotte');
    expect(merged.id).toBe(buonanotte.id);
    expect(merged.bookCount).toBe(2);
    expect((await tags.findAll()).map((t) => t.name)).toEqual(['animali', 'buonanotte']);
    const a = (await repos.books.findAll({ text: 'A' }))[0];
    expect(a?.tags).toEqual(['animali', 'buonanotte']);
  });

  it('rifiuta nomi vuoti e id inesistenti', async () => {
    const [t] = await tags.findAll();
    await expect(tags.rename(t!.id, '   ')).rejects.toBeInstanceOf(ValidationError);
    await expect(tags.rename('nope', 'x')).rejects.toBeInstanceOf(NotFoundError);
    await expect(tags.remove('nope')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('elimina un tag e le sue associazioni', async () => {
    const [animali] = await tags.findAll();
    await tags.remove(animali!.id);
    expect((await tags.findAll()).map((t) => t.name)).toEqual(['buonanotte', 'dinosauri']);
    expect((await repos.books.findAll({ text: 'C' }))[0]?.tags).toEqual([]);
  });

  it('ensure crea solo se manca', async () => {
    const created = await tags.ensure('Scuola');
    const again = await tags.ensure('scuola ');
    expect(again.id).toBe(created.id);
    expect(again.bookCount).toBe(0);
  });
});
