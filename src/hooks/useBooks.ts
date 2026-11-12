import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Book, BookPatch, BookQuery, NewBook } from '@/domain/types';

import { queryKeys } from './queryKeys';
import { useServices } from './ServicesContext';

export function useBooks(query: BookQuery) {
  const { repos } = useServices();
  return useQuery({
    queryKey: queryKeys.books.list(query),
    queryFn: () => repos.books.findAll(query),
  });
}

export function useBook(id: string | undefined) {
  const { repos } = useServices();
  return useQuery({
    queryKey: queryKeys.books.detail(id ?? ''),
    queryFn: () => repos.books.findById(id!),
    enabled: !!id,
  });
}

export function useBookCount() {
  const { repos } = useServices();
  return useQuery({ queryKey: queryKeys.books.count, queryFn: () => repos.books.count() });
}

export function useGroupCounts(field: 'ageRange' | 'bookType' | 'status') {
  const { repos } = useServices();
  return useQuery({
    queryKey: queryKeys.books.countBy(field),
    queryFn: () => repos.books.countBy(field),
  });
}

export interface CreateBookInput {
  book: NewBook;
  /** Copertina da scaricare in background dopo il salvataggio (da metadati online). */
  coverUrl?: string;
}

export interface UpdateBookInput {
  id: string;
  patch: BookPatch;
  coverUrl?: string;
}

/** Mutazioni sui libri con invalidazione della cache. */
export function useBookMutations() {
  const { repos, covers } = useServices();
  const qc = useQueryClient();
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.books.all }),
      qc.invalidateQueries({ queryKey: queryKeys.tags.all }),
    ]);

  const attachCover = async (book: Book, coverUrl?: string): Promise<Book> => {
    if (!coverUrl) return book;
    const path = await covers.download(coverUrl, book.id);
    if (!path) return book;
    const updated = await repos.books.update(book.id, { coverPath: path });
    await invalidate();
    return updated;
  };

  const create = useMutation({
    mutationFn: async ({ book, coverUrl }: CreateBookInput) => {
      const created = await repos.books.create(book);
      await invalidate();
      // La copertina si scarica dopo: il salvataggio non aspetta la rete.
      void attachCover(created, coverUrl);
      return created;
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch, coverUrl }: UpdateBookInput) => {
      const updated = await repos.books.update(id, patch);
      await invalidate();
      if (coverUrl && !updated.coverPath) void attachCover(updated, coverUrl);
      return updated;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await repos.books.remove(id);
      await invalidate();
    },
  });

  return { create, update, remove };
}
