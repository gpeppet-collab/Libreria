import type { BookQuery } from '@/domain/types';

/** Chiavi di cache di TanStack Query, centralizzate per invalidazioni coerenti. */
export const queryKeys = {
  books: {
    all: ['books'] as const,
    list: (query: BookQuery) => ['books', 'list', query] as const,
    detail: (id: string) => ['books', 'detail', id] as const,
    count: ['books', 'count'] as const,
    countBy: (field: string) => ['books', 'countBy', field] as const,
  },
  tags: {
    all: ['tags'] as const,
    suggest: (prefix: string) => ['tags', 'suggest', prefix] as const,
  },
  bookTypes: { all: ['bookTypes'] as const },
};
