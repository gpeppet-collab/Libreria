import { ExportFormatError } from '@/domain/export';

import { createTestDatabase, type NodeSqliteDatabase } from '@/data/__tests__/nodeSqlite';
import { createRepositories, type Repositories } from '@/data/repositories';
import { ISBN_A, ISBN_B, newBook } from '@/data/__tests__/fixtures';

import { MemoryFilePort } from '../../__tests__/MemoryFilePort';
import { CoverService } from '../../covers/CoverService';
import { ExportImportService } from '../ExportImportService';

let db: NodeSqliteDatabase;
let repos: Repositories;
let files: MemoryFilePort;
let covers: CoverService;
let service: ExportImportService;

beforeEach(async () => {
  db = await createTestDatabase();
  files = new MemoryFilePort();
  covers = new CoverService(files);
  repos = createRepositories(db, { onBookRemoved: (b) => covers.remove(b.coverPath) });
  service = new ExportImportService(repos, covers, files);
});
afterEach(() => db.close());

async function seed() {
  const popup = await repos.bookTypes.create('Pop-up');
  const created = await repos.books.create(
    newBook({
      title: 'Con copertina',
      isbn: ISBN_A,
      tags: ['animali'],
      bookTypeId: popup.id,
      ageRange: '3-5',
      rating: 4,
    }),
  );
  const coverPath = await covers.storeBase64('Q09WRVI=', created.id);
  const a = await repos.books.update(created.id, { coverPath });
  const b = await repos.books.create(
    newBook({ title: 'Senza copertina', isbn: ISBN_B, bookTypeId: 'albo_illustrato' }),
  );
  return { a, b, popup };
}

describe('ExportImportService.exportLibrary', () => {
  it('scrive il JSON nella cache, include le copertine e condivide', async () => {
    const { popup } = await seed();
    const summary = await service.exportLibrary({ now: new Date('2026-05-06T08:00:00Z') });
    expect(summary).toEqual({
      uri: 'file:///app/cache/libreria-2026-05-06.json',
      fileName: 'libreria-2026-05-06.json',
      books: 2,
      covers: 1,
    });
    expect(files.shared).toEqual([{ uri: summary.uri, mimeType: 'application/json' }]);

    const doc = JSON.parse(files.files.get(summary.uri)!);
    expect(doc.format).toBe('libreria-export');
    expect(doc.bookTypes.some((t: { id: string }) => t.id === popup.id)).toBe(true);
    const withCover = doc.books.find((b: { title: string }) => b.title === 'Con copertina');
    expect(withCover.bookType).toBe('Pop-up');
    expect(withCover.tags).toEqual(['animali']);
    expect(withCover.coverBase64).toBe('Q09WRVI=');
    expect(withCover.coverPath).toBeUndefined();
    const without = doc.books.find((b: { title: string }) => b.title === 'Senza copertina');
    expect(without.coverBase64).toBeUndefined();
  });

  it('può escludere le copertine e la condivisione', async () => {
    await seed();
    const summary = await service.exportLibrary({ includeCovers: false, share: false });
    expect(summary.covers).toBe(0);
    expect(files.shared).toEqual([]);
    expect(JSON.parse(files.files.get(summary.uri)!).books[0].coverBase64).toBeUndefined();
  });
});

describe('ExportImportService import', () => {
  it('anteprima: conta nuovi, esistenti e tipi da creare; file non valido → ExportFormatError', async () => {
    await seed();
    const text = JSON.stringify({
      format: 'libreria-export',
      version: 1,
      bookTypes: [],
      books: [
        { id: 'nuovo-1', title: 'Nuovo', bookType: 'Audiolibro' },
        { id: 'x', isbn: ISBN_A, title: 'Stesso ISBN', bookType: 'pop-up' },
        { id: 'nuovo-2', title: 'Altro', bookType: 'Albo illustrato' },
      ],
    });
    const preview = await service.previewImport(text, 'f.json');
    expect(preview).toMatchObject({
      fileName: 'f.json',
      total: 3,
      newBooks: 2,
      existing: 1,
      newBookTypes: ['Audiolibro'],
    });

    await expect(service.previewImport('{ non json')).rejects.toBeInstanceOf(ExportFormatError);
    await expect(service.previewImport('{"format":"altro"}')).rejects.toBeInstanceOf(
      ExportFormatError,
    );
  });

  it('pickImportFile legge il file scelto e restituisce null se annullato', async () => {
    files.nextPick = null;
    expect(await service.pickImportFile()).toBeNull();
    files.stagePick(
      'backup.json',
      JSON.stringify({ format: 'libreria-export', version: 1, bookTypes: [], books: [] }),
    );
    expect(await service.pickImportFile()).toMatchObject({ fileName: 'backup.json', total: 0 });
  });

  it('applica l import: crea i tipi, unisce i libri, salva le copertine', async () => {
    const { a, b } = await seed();
    const text = JSON.stringify({
      format: 'libreria-export',
      version: 1,
      bookTypes: [],
      books: [
        {
          id: 'nuovo-1',
          title: 'Nuovo con copertina',
          bookType: 'Audiolibro',
          coverBase64: 'TkVX',
          tags: ['Regalo'],
        },
        {
          id: 'altro',
          isbn: ISBN_A,
          title: 'Sostituisce A',
          bookType: 'POP-UP',
          coverBase64: 'UkVQTA==',
        },
        { id: b.id, title: 'Sostituisce B', bookType: null },
      ],
    });
    const preview = await service.previewImport(text);

    const kept = await service.applyImport(preview.data, 'keep');
    expect(kept).toEqual({ inserted: 1, replaced: 0, skipped: 2 });
    expect((await repos.books.findById(a.id))?.title).toBe('Con copertina');
    expect((await repos.bookTypes.findByName('Audiolibro'))?.builtin).toBe(false);
    const nuovo = await repos.books.findById('nuovo-1');
    expect(nuovo?.tags).toEqual(['regalo']);
    expect(nuovo?.bookTypeId).toBe((await repos.bookTypes.findByName('audiolibro'))?.id);
    expect(nuovo?.coverPath).toBe(covers.pathFor('nuovo-1'));
    expect(files.files.get(covers.pathFor('nuovo-1'))).toBe('TkVX');
    // Con "keep" la copertina di A non viene toccata.
    expect(files.files.get(a.coverPath!)).toBe('Q09WRVI=');

    const replaced = await service.applyImport(preview.data, 'replace');
    expect(replaced).toEqual({ inserted: 0, replaced: 3, skipped: 0 });
    const a2 = await repos.books.findById(a.id);
    expect(a2?.title).toBe('Sostituisce A');
    expect(a2?.bookTypeId).toBe((await repos.bookTypes.findByName('Pop-up'))?.id);
    expect(a2?.coverPath).toBe(covers.pathFor(a.id));
    expect(files.files.get(a2!.coverPath!)).toBe('UkVQTA==');
    expect((await repos.books.findById(b.id))?.title).toBe('Sostituisce B');
    expect(await repos.books.findById('altro')).toBeNull();
    expect((await repos.bookTypes.findAll()).filter((t) => !t.builtin).map((t) => t.name)).toEqual([
      'Pop-up',
      'Audiolibro',
    ]);
  });

  it('eliminando un libro si cancella la copertina locale', async () => {
    const { a } = await seed();
    expect(files.files.has(a.coverPath!)).toBe(true);
    await repos.books.remove(a.id);
    expect(files.files.has(a.coverPath!)).toBe(false);
  });
});
