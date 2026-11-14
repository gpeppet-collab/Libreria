import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { t } from '@/i18n/it';

import { BookForm, type BookFormResult } from '../BookForm';
import { createTestServices, renderWithServices, type TestContext } from './testUtils';

const ISBN = '9780140328721';
let ctx: TestContext;

beforeEach(async () => {
  ctx = await createTestServices();
});
afterEach(() => ctx.db.close());

describe('BookForm', () => {
  it('richiede il titolo e segnala ISBN non valido', async () => {
    const onSubmit = jest.fn();
    await renderWithServices(<BookForm onSubmit={onSubmit} />, ctx.services);
    await fireEvent.changeText(screen.getByLabelText(t.form.isbn), '123');
    await fireEvent.press(screen.getByText(t.common.save));
    expect(await screen.findByText(t.form.titleRequired)).toBeTruthy();
    expect(screen.getByText(t.form.invalidIsbn)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('salva con classificazione, tag, stato e valutazione', async () => {
    const onSubmit = jest.fn<void, [BookFormResult]>();
    await renderWithServices(<BookForm onSubmit={onSubmit} />, ctx.services);
    await screen.findByText('Albo illustrato');

    await fireEvent.changeText(screen.getByLabelText(t.form.title), '  Il Gruffalò ');
    await fireEvent.changeText(
      screen.getByLabelText(t.form.authors),
      'Julia Donaldson, Axel Scheffler',
    );
    await fireEvent.changeText(screen.getByLabelText(t.form.isbn), '0-306-40615-2');
    await fireEvent.press(screen.getByText('3-5 anni'));
    await fireEvent.press(screen.getByText('Albo illustrato'));
    await fireEvent.changeText(screen.getByLabelText(t.form.tags), 'Animali, bosco,');
    await fireEvent.press(screen.getByText('Letto'));
    await fireEvent.press(screen.getByTestId('star-5'));
    await fireEvent.press(screen.getByText(t.common.save));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const { book, coverUrls } = onSubmit.mock.calls[0]![0];
    expect(coverUrls).toBeUndefined();
    expect(book).toMatchObject({
      title: '  Il Gruffalò ',
      authors: ['Julia Donaldson', 'Axel Scheffler'],
      isbn: '9780306406157',
      ageRange: '3-5',
      bookTypeId: 'albo_illustrato',
      tags: ['animali', 'bosco'],
      status: 'letto',
      rating: 5,
    });
  });

  it('con ISBN iniziale cerca online, precompila e propone i tag senza applicarli', async () => {
    ctx.metadata.set(ISBN, {
      isbn: ISBN,
      title: 'Fantastic Mr Fox',
      authors: ['Roald Dahl'],
      publishedYear: 2007,
      coverUrl: 'https://example.org/c.jpg',
      source: 'google_books',
      suggestedTags: ['volpi'],
    });
    const onSubmit = jest.fn<void, [BookFormResult]>();
    await renderWithServices(<BookForm initialIsbn={ISBN} onSubmit={onSubmit} />, ctx.services);

    expect(
      await screen.findByText(
        new RegExp(`${t.form.lookupFound('Google Books')}[\\s\\S]*Google Books: trovato`),
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText(t.form.title).props.value).toBe('Fantastic Mr Fox');
    expect(screen.getByLabelText(t.form.authors).props.value).toBe('Roald Dahl');
    expect(screen.getByText(t.form.coverWillDownload)).toBeTruthy();
    expect(screen.getByText('+ volpi')).toBeTruthy();

    await fireEvent.press(screen.getByText(t.common.save));
    let call = onSubmit.mock.calls[0]![0];
    expect(call.book.tags).toEqual([]);
    expect(call.book.publishedYear).toBe(2007);
    expect(call.coverUrls).toEqual(['https://example.org/c.jpg']);

    await fireEvent.press(screen.getByText('+ volpi'));
    await fireEvent.press(screen.getByText(t.common.save));
    call = onSubmit.mock.calls[1]![0];
    expect(call.book.tags).toEqual(['volpi']);
  });

  it('se il libro non è noto online lo dice e lascia il form vuoto', async () => {
    await renderWithServices(<BookForm initialIsbn={ISBN} onSubmit={jest.fn()} />, ctx.services);
    expect(
      await screen.findByText(new RegExp(`Google Books: limite richieste[\\s\\S]*chiave gratuita`)),
    ).toBeTruthy();
    expect(screen.getByLabelText(t.form.title).props.value).toBe('');
    expect(screen.getByLabelText(t.form.isbn).props.value).toBe(ISBN);
  });

  it('suggerisce i tag già esistenti mentre si scrive', async () => {
    await ctx.services.repos.books.create({
      isbn: null,
      title: 'X',
      authors: [],
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
      tags: ['dinosauri'],
    });
    await renderWithServices(<BookForm onSubmit={jest.fn()} />, ctx.services);
    await fireEvent.changeText(screen.getByLabelText(t.form.tags), 'din');
    await waitFor(() => expect(screen.getByText('dinosauri (1)')).toBeTruthy());
  });

  it('permette di scegliere una foto come copertina, che prevale su quelle online', async () => {
    ctx.metadata.set(ISBN, {
      isbn: ISBN,
      title: 'T',
      authors: [],
      coverUrl: 'https://example.org/c.jpg',
      source: 'sbn',
    });
    ctx.files.files.set('file:///app/cache/foto.jpg', 'FOTO');
    ctx.files.nextImage = { uri: 'file:///app/cache/foto.jpg', name: 'foto.jpg' };
    const onSubmit = jest.fn<void, [BookFormResult]>();
    await renderWithServices(<BookForm initialIsbn={ISBN} onSubmit={onSubmit} />, ctx.services);
    expect(await screen.findByText(t.form.coverWillDownload)).toBeTruthy();

    await fireEvent.press(screen.getByText(t.form.coverCamera));
    expect(await screen.findByText(t.form.coverRemove)).toBeTruthy();
    expect(screen.queryByText(t.form.coverWillDownload)).toBeNull();
    await fireEvent.press(screen.getByText(t.common.save));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      coverFileUri: 'file:///app/cache/foto.jpg',
      coverUrls: undefined,
    });
  });

  it('una copertina salvata che non si carica conta come assente e viene sostituita da quella online', async () => {
    ctx.metadata.set(ISBN, {
      isbn: ISBN,
      title: 'T',
      authors: [],
      coverUrl: 'https://example.org/c.jpg',
      source: 'google_books',
    });
    const saved = await ctx.services.repos.books.create({
      isbn: ISBN,
      title: 'T',
      authors: [],
      publisher: null,
      publishedYear: null,
      pageCount: null,
      description: null,
      coverPath: 'file:///app/documents/covers/rotta.jpg',
      status: 'da_leggere',
      rating: null,
      notes: null,
      startedAt: null,
      finishedAt: null,
      ageRange: null,
      bookTypeId: null,
      tags: [],
    });
    const onSubmit = jest.fn<void, [BookFormResult]>();
    await renderWithServices(<BookForm initial={saved} onSubmit={onSubmit} />, ctx.services);

    await fireEvent.press(screen.getByText(t.form.lookup));
    await screen.findByText(/Google Books: trovato/);
    // Con una copertina valida quella online non serve.
    expect(screen.queryByText(t.form.coverWillDownload)).toBeNull();

    await fireEvent(screen.getByLabelText('Copertina di T'), 'error');
    expect(await screen.findByText(t.form.coverWillDownload)).toBeTruthy();
    await fireEvent.press(screen.getByText(t.common.save));
    const result = onSubmit.mock.calls[0]![0];
    expect(result.book.coverPath).toBeNull();
    expect(result.coverUrls).toEqual(['https://example.org/c.jpg']);
  });
});
