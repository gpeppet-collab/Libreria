import { normalizeTagList } from './tags';
import {
  AGE_RANGES,
  READING_STATUSES,
  type AgeRange,
  type BookQuery,
  type ReadingStatus,
} from './types';

/**
 * Conversione tra `BookQuery` e parametri di navigazione (stringhe),
 * usata dalla lista (`/`) per ricevere filtri da altre schermate.
 */
export type BookQueryParams = Partial<
  Record<'text' | 'status' | 'ageRange' | 'bookTypeId' | 'tags' | 'sort' | 'direction', string>
>;

const SORTS = ['title', 'author', 'createdAt', 'ageRange'] as const;

export function parseBookQueryParams(
  params: Record<string, string | string[] | undefined>,
): BookQuery {
  const one = (k: string): string | undefined => {
    const v = params[k];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.trim() ? s : undefined;
  };
  const query: BookQuery = {};
  const text = one('text');
  if (text) query.text = text;
  const status = one('status');
  if (status && READING_STATUSES.includes(status as ReadingStatus))
    query.status = status as ReadingStatus;
  const ageRange = one('ageRange');
  if (ageRange && AGE_RANGES.includes(ageRange as AgeRange)) query.ageRange = ageRange as AgeRange;
  const bookTypeId = one('bookTypeId');
  if (bookTypeId) query.bookTypeId = bookTypeId;
  const tags = one('tags');
  if (tags) {
    const list = normalizeTagList(tags.split(','));
    if (list.length) query.tags = list;
  }
  const sort = one('sort');
  if (sort && (SORTS as readonly string[]).includes(sort)) query.sort = sort as BookQuery['sort'];
  const direction = one('direction');
  if (direction === 'asc' || direction === 'desc') query.direction = direction;
  return query;
}

export function bookQueryToParams(query: BookQuery): BookQueryParams {
  const p: BookQueryParams = {};
  if (query.text) p.text = query.text;
  if (query.status) p.status = query.status;
  if (query.ageRange) p.ageRange = query.ageRange;
  if (query.bookTypeId) p.bookTypeId = query.bookTypeId;
  if (query.tags?.length) p.tags = query.tags.join(',');
  if (query.sort) p.sort = query.sort;
  if (query.direction) p.direction = query.direction;
  return p;
}

/** Numero di filtri attivi (esclusi ricerca testuale e ordinamento). */
export function countActiveFilters(query: BookQuery): number {
  return (
    (query.status ? 1 : 0) +
    (query.ageRange ? 1 : 0) +
    (query.bookTypeId ? 1 : 0) +
    (query.tags?.length ?? 0)
  );
}
