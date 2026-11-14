import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { NewBook } from '@/domain/types';
import { t } from '@/i18n/it';
import { createTestServices, renderWithServices, type TestContext } from '@/ui/__tests__/testUtils';

import BookDetailScreen from '../book/[id]/index';
import GroupsScreen from '../groups';
import BookListScreen from '../index';
import TagsSettingsScreen from '../settings/tags';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = (require('expo-router') as { router: Record<string, jest.Mock> }).router;

function book(overrides: Partial<NewBook>): NewBook {
  return {
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
    tags: [],
    ...overrides,
  };
}

let ctx: TestContext;
beforeEach(async () => {
  ctx = await createTestServices();
  mockParams = {};
  jest.clearAllMocks();
  const repo = ctx.services.repos.books;
  await repo.create(
    book({
      title: 'Il Gruffalò',
      authors: ['Julia Donaldson'],
      ageRange: '3-5',
      bookTypeId: 'albo_illustrato',
      tags: ['bosco', 'buonanotte'],
    }),
  );
  await repo.create(
    book({
      title: 'Indovina quanto bene ti voglio',
      ageRange: '0-2',
      bookTypeId: 'cartonato',
      tags: ['buonanotte'],
    }),
  );
  await repo.create(
    book({
      title: 'Matilde',
      authors: ['Roald Dahl'],
      ageRange: '9-12',
      bookTypeId: 'romanzo_ragazzi',
      status: 'letto',
    }),
  );
});
afterEach(() => ctx.db.close());

describe('Lista libri', () => {
  it('mostra i libri, cerca e filtra per tag', async () => {
    await renderWithServices(<BookListScreen />, ctx.services);
    expect(await screen.findByText('Il Gruffalò')).toBeTruthy();
    expect(screen.getByText(t.list.count(3))).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText(t.list.searchPlaceholder), 'dahl');
    await waitFor(() => expect(screen.getByText(t.list.count(1))).toBeTruthy());
    expect(screen.getByText('Matilde')).toBeTruthy();
    expect(screen.queryByText('Il Gruffalò')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText(t.list.searchPlaceholder), '');
    await fireEvent.press(screen.getByText(t.list.filters));
    await fireEvent.press(await screen.findByText('buonanotte (2)'));
    await waitFor(() => expect(screen.getByText(t.list.count(2))).toBeTruthy());
    expect(screen.queryByText('Matilde')).toBeNull();

    await fireEvent.press(screen.getAllByText('3-5 anni')[0]!);
    await waitFor(() => expect(screen.getByText(t.list.count(1))).toBeTruthy());
    expect(screen.getByText(`${t.list.filters} (2)`)).toBeTruthy();
  });

  it('applica i filtri ricevuti come parametri di navigazione', async () => {
    mockParams = { ageRange: '0-2' };
    await renderWithServices(<BookListScreen />, ctx.services);
    expect(await screen.findByText('Indovina quanto bene ti voglio')).toBeTruthy();
    expect(screen.queryByText('Il Gruffalò')).toBeNull();
  });

  it('apre il dettaglio toccando un libro', async () => {
    await renderWithServices(<BookListScreen />, ctx.services);
    await fireEvent.press(await screen.findByText('Matilde'));
    expect(mockRouter.push).toHaveBeenCalledWith(expect.stringMatching(/^\/book\/[0-9a-f-]{36}$/));
  });
});

describe('Vista per gruppo', () => {
  it('conta per fascia d età e per tipo, e apre la lista filtrata', async () => {
    await renderWithServices(<GroupsScreen />, ctx.services);
    await fireEvent.press(await screen.findByText('3-5 anni'));
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: '/',
      params: { ageRange: '3-5' },
    });

    await fireEvent.press(screen.getByText(t.groups.byBookType));
    expect(await screen.findByText('Libro cartonato')).toBeTruthy();
    expect(screen.getAllByText(t.list.count(1))).toHaveLength(3);
  });
});

describe('Gruppo "non indicata"', () => {
  it('apre la lista dei libri senza fascia d età', async () => {
    await ctx.services.repos.books.create(book({ title: 'Senza fascia' }));
    await renderWithServices(<GroupsScreen />, ctx.services);
    await fireEvent.press(await screen.findByText('Non indicata'));
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: '/',
      params: { ageRange: 'none' },
    });

    mockParams = { ageRange: 'none' };
    await renderWithServices(<BookListScreen />, ctx.services);
    expect(await screen.findByText('Senza fascia')).toBeTruthy();
    expect(screen.queryByText('Matilde')).toBeNull();
  });
});

describe('Gestione tag', () => {
  it('aggiunge un tag nuovo, che compare tra quelli proponibili', async () => {
    await renderWithServices(<TagsSettingsScreen />, ctx.services);
    await screen.findByText('bosco');
    await fireEvent.changeText(screen.getByPlaceholderText(t.tags.newPlaceholder), '  Natale ');
    await fireEvent.press(screen.getAllByText(t.common.add).at(-1)!);
    expect(await screen.findByText('natale')).toBeTruthy();
    expect((await ctx.services.repos.tags.findAll()).map((x) => x.name)).toContain('natale');
  });
});

describe('Dettaglio libro', () => {
  it('cambia stato e valutazione in un tocco', async () => {
    const [matilde] = await ctx.services.repos.books.findAll({ text: 'Matilde' });
    mockParams = { id: matilde!.id };
    await renderWithServices(<BookDetailScreen />, ctx.services);
    expect(await screen.findByText('Matilde')).toBeTruthy();
    expect(screen.getByText('Romanzo per ragazzi')).toBeTruthy();

    await fireEvent.press(screen.getByText('In lettura'));
    await fireEvent.press(screen.getByTestId('star-3'));
    await waitFor(async () => {
      const b = await ctx.services.repos.books.findById(matilde!.id);
      expect(b?.status).toBe('in_lettura');
      expect(b?.rating).toBe(3);
    });
  });
});
