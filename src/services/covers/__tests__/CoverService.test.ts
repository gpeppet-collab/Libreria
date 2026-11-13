import { MemoryFilePort } from '../../__tests__/MemoryFilePort';
import { CoverService } from '../CoverService';

let files: MemoryFilePort;
let covers: CoverService;
const errors: unknown[] = [];

beforeEach(() => {
  files = new MemoryFilePort();
  errors.length = 0;
  covers = new CoverService(files, { onError: (e) => errors.push(e) });
});

describe('CoverService', () => {
  it('scarica la copertina nella cartella covers e restituisce il path', async () => {
    files.downloads.set('https://x/cover.jpg', 'JPEGDATA');
    const path = await covers.download('https://x/cover.jpg', 'book-1');
    expect(path).toBe('file:///app/documents/covers/book-1.jpg');
    expect(files.files.get(path!)).toBe('JPEGDATA');
    expect(files.directories.has('file:///app/documents/covers/')).toBe(true);
  });

  it('restituisce null e non lascia residui se il download fallisce', async () => {
    files.downloads.set('https://x/ko.jpg', new Error('404'));
    expect(await covers.download('https://x/ko.jpg', 'book-2')).toBeNull();
    expect(files.files.size).toBe(0);
    expect(errors).toHaveLength(1);
  });

  it('prova i candidati in ordine; se nessuno si scarica ripiega sul primo URL remoto', async () => {
    files.downloads.set('https://x/a.jpg', new Error('404'));
    files.downloads.set('https://x/b.jpg', 'JPEG-B');
    expect(await covers.downloadFirst(['https://x/a.jpg', 'https://x/b.jpg'], 'book-9')).toBe(
      covers.pathFor('book-9'),
    );
    expect(files.files.get(covers.pathFor('book-9'))).toBe('JPEG-B');

    files.downloads.set('https://x/b.jpg', new Error('404'));
    expect(await covers.downloadFirst(['https://x/a.jpg', 'https://x/b.jpg'], 'book-10')).toBe(
      'https://x/a.jpg',
    );
    expect(await covers.downloadFirst(['https://x/a.jpg'], 'book-11')).toBeNull();
    expect(
      await covers.downloadFirst(['https://x/a.jpg', 'https://x/b.jpg'], 'book-12', false),
    ).toBeNull();
    expect(await covers.downloadFirst([], 'book-13')).toBeNull();
  });

  it('salva e rilegge in base64', async () => {
    const path = await covers.storeBase64('QUJD', 'book-3');
    expect(path).toBe(covers.pathFor('book-3'));
    expect(await covers.readBase64(path)).toBe('QUJD');
    expect(await covers.readBase64(null)).toBeNull();
    expect(await covers.readBase64('file:///app/documents/covers/missing.jpg')).toBeNull();
    files.failWrites = true;
    expect(await covers.storeBase64('QUJD', 'book-4')).toBeNull();
  });

  it('elimina solo file nella cartella covers', async () => {
    const path = (await covers.storeBase64('QUJD', 'book-5'))!;
    files.files.set('file:///app/documents/altro.txt', 'x');
    await covers.remove('file:///app/documents/altro.txt');
    expect(files.files.has('file:///app/documents/altro.txt')).toBe(true);
    await covers.remove(path);
    expect(files.files.has(path)).toBe(false);
    await expect(covers.remove(null)).resolves.toBeUndefined();
  });
});
