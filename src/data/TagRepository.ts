import type { Tag } from '@/domain/types';

/** Gestione dei tag (RF13). I nomi sono sempre normalizzati con `normalizeTagName`. */
export interface TagRepository {
  /** Tutti i tag con `bookCount`, ordinati per nome. */
  findAll(): Promise<Tag[]>;
  /** Suggerimenti per l'autocompletamento. */
  suggest(prefix: string, limit?: number): Promise<Tag[]>;
  /** Rinomina; se il nuovo nome esiste già, i due tag vengono uniti. */
  rename(id: string, name: string): Promise<Tag>;
  /** Elimina il tag e le sue associazioni. */
  remove(id: string): Promise<void>;
}
