import type { BookType } from '@/domain/types';

/** Gestione dei tipi di libro (RF12): predefiniti più quelli creati dall'utente. */
export interface BookTypeRepository {
  /** Ordinati per `sortOrder`, poi per nome. */
  findAll(): Promise<BookType[]>;
  create(name: string): Promise<BookType>;
  rename(id: string, name: string): Promise<BookType>;
  /** Rifiutato (errore) se il tipo è `builtin`. I libri associati restano senza tipo. */
  remove(id: string): Promise<void>;
}
