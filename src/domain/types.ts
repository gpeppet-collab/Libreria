/**
 * Tipi di dominio di Libreria.
 *
 * Questo modulo non deve importare nulla da React, React Native o Expo:
 * deve restare eseguibile in puro Node per i test unitari.
 * Riferimento: docs/03-interfacce.md
 */

/** Stato di lettura di un libro. */
export type ReadingStatus = 'da_leggere' | 'in_lettura' | 'letto' | 'abbandonato';

export const READING_STATUSES: readonly ReadingStatus[] = [
  'da_leggere',
  'in_lettura',
  'letto',
  'abbandonato',
];

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  da_leggere: 'Da leggere',
  in_lettura: 'In lettura',
  letto: 'Letto',
  abbandonato: 'Abbandonato',
};

/** Fascia d'età consigliata. Lista fissa nel dominio: cambia solo con una release. */
export type AgeRange = '0-2' | '3-5' | '6-8' | '9-12' | '13+' | 'adulti';

export const AGE_RANGES: readonly AgeRange[] = ['0-2', '3-5', '6-8', '9-12', '13+', 'adulti'];

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  '0-2': '0-2 anni',
  '3-5': '3-5 anni',
  '6-8': '6-8 anni',
  '9-12': '9-12 anni',
  '13+': '13+ anni',
  adulti: 'Adulti',
};

/** Valutazione a stelle. */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** Tipo/genere di libro: lista predefinita (builtin) estendibile dall'utente. */
export interface BookType {
  /** Slug stabile, es. `albo_illustrato`, oppure uuid per i tipi creati dall'utente. */
  id: string;
  name: string;
  /** I tipi predefiniti non si possono eliminare. */
  builtin: boolean;
  sortOrder: number;
}

/** Tag libero. `bookCount` è valorizzato solo dalle query che lo calcolano. */
export interface Tag {
  id: string;
  /** Nome normalizzato (vedi `normalizeTagName`). */
  name: string;
  bookCount?: number;
}

/** Un libro del catalogo. Le date sono stringhe ISO 8601 (UTC). */
export interface Book {
  id: string;
  /** ISBN-13 normalizzato (13 cifre, senza trattini) oppure null. */
  isbn: string | null;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  description: string | null;
  /** Percorso locale della copertina nel file system dell'app, oppure null. */
  coverPath: string | null;
  status: ReadingStatus;
  rating: Rating | null;
  notes: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  ageRange: AgeRange | null;
  bookTypeId: string | null;
  /** Nomi dei tag, normalizzati. */
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Dati necessari per creare un libro. */
export type NewBook = Omit<Book, 'id' | 'createdAt' | 'updatedAt'>;

/** Modifica parziale di un libro. */
export type BookPatch = Partial<NewBook>;

/** Criteri di ricerca, filtro e ordinamento della lista. */
export interface BookQuery {
  /** Ricerca testuale su titolo, autori e ISBN (case-insensitive). */
  text?: string;
  status?: ReadingStatus;
  ageRange?: AgeRange;
  bookTypeId?: string;
  /** Filtro AND: il libro deve avere tutti i tag indicati. */
  tags?: string[];
  sort?: 'title' | 'author' | 'createdAt' | 'ageRange';
  direction?: 'asc' | 'desc';
}

/** Conteggio per gruppo, usato dalla vista raggruppata. `key` null = "non indicato". */
export interface GroupCount {
  key: string | null;
  label: string;
  count: number;
}

/** Esito di un import. */
export interface ImportResult {
  inserted: number;
  replaced: number;
  skipped: number;
}
