import type { NewBook } from '@/domain/types';

import type { BookMetadata } from './MetadataProvider';

/**
 * Campi del form precompilabili da un risultato del lookup (RF3).
 * Non tocca classificazione, stato, note: li sceglie l'utente.
 */
export function metadataToBookFields(meta: BookMetadata): Partial<NewBook> {
  return {
    isbn: meta.isbn,
    title: meta.title,
    authors: meta.authors,
    publisher: meta.publisher ?? null,
    publishedYear: meta.publishedYear ?? null,
    pageCount: meta.pageCount ?? null,
    description: meta.description ?? null,
  };
}
