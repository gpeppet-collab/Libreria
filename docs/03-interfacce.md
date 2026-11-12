# 03 · Interfacce

**Versione documento:** 1.0 (2026-11-11)
I contratti qui descritti esistono come codice in `src/domain`, `src/data` e `src/services`: il codice è la fonte di verità, questo documento ne spiega l'uso.

## 1. Tipi di dominio (`src/domain/types.ts`)

```ts
export type ReadingStatus = 'da_leggere' | 'in_lettura' | 'letto' | 'abbandonato';
export type AgeRange = '0-2' | '3-5' | '6-8' | '9-12' | '13+' | 'adulti';
export type Rating = 1 | 2 | 3 | 4 | 5;

export interface BookType {
  id: string;
  name: string;
  builtin: boolean;
  sortOrder: number;
}
export interface Tag {
  id: string;
  name: string;
  bookCount?: number;
}

export interface Book {
  id: string; // uuid v4
  isbn: string | null; // ISBN-13 normalizzato
  title: string;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  description: string | null;
  coverPath: string | null; // path locale
  status: ReadingStatus;
  rating: Rating | null;
  notes: string | null;
  startedAt: string | null; // ISO 8601
  finishedAt: string | null;
  ageRange: AgeRange | null;
  bookTypeId: string | null;
  tags: string[]; // nomi normalizzati
  createdAt: string;
  updatedAt: string;
}

export type NewBook = Omit<Book, 'id' | 'createdAt' | 'updatedAt'>;
export type BookPatch = Partial<NewBook>;

export interface BookQuery {
  text?: string; // titolo, autori, ISBN (case-insensitive)
  status?: ReadingStatus;
  ageRange?: AgeRange;
  bookTypeId?: string;
  tags?: string[]; // AND: tutti i tag indicati
  sort?: 'title' | 'author' | 'createdAt' | 'ageRange';
  direction?: 'asc' | 'desc';
}

export interface GroupCount {
  key: string | null;
  label: string;
  count: number;
}
export interface ImportResult {
  inserted: number;
  replaced: number;
  skipped: number;
}
```

Costanti e etichette italiane: `READING_STATUSES`, `READING_STATUS_LABELS`, `AGE_RANGES`, `AGE_RANGE_LABELS`, `BUILTIN_BOOK_TYPES` (in `bookTypes.ts`).

## 2. Regole pure

| Modulo             | Funzione                                                           | Contratto                                                                                                                            |
| ------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `domain/isbn.ts`   | `normalizeIsbn(raw)`                                               | Accetta ISBN-10, ISBN-13, EAN-13 con o senza trattini/prefisso "ISBN"; restituisce l'ISBN-13 (13 cifre) oppure `null` se non valido. |
|                    | `isValidIsbn10`, `isValidIsbn13`, `isbn10ToIsbn13`, `formatIsbn13` | Validazione checksum e formattazione per la UI.                                                                                      |
| `domain/tags.ts`   | `normalizeTagName(raw)`                                            | trim, minuscolo (locale it-IT), spazi multipli → uno, max 40 caratteri.                                                              |
|                    | `normalizeTagList`, `parseTagInput`                                | Deduplica; divide l'input utente su `,` `;` e a capo.                                                                                |
| `domain/export.ts` | `isLibraryExport(value)`                                           | Type guard strutturale sul file di import.                                                                                           |

## 3. Repository (`src/data/`)

```ts
export interface BookRepository {
  findAll(query?: BookQuery): Promise<Book[]>;
  findById(id: string): Promise<Book | null>;
  findByIsbn(isbn: string): Promise<Book | null>; // isbn già normalizzato
  create(book: NewBook): Promise<Book>;
  update(id: string, patch: BookPatch): Promise<Book>;
  remove(id: string): Promise<void>;
  count(): Promise<number>;
  countBy(field: 'ageRange' | 'bookType' | 'status'): Promise<GroupCount[]>;
  bulkUpsert(books: Book[], strategy: 'replace' | 'keep'): Promise<ImportResult>;
}

export interface TagRepository {
  findAll(): Promise<Tag[]>; // con bookCount, per nome
  suggest(prefix: string, limit?: number): Promise<Tag[]>;
  rename(id: string, name: string): Promise<Tag>; // unisce se il nome esiste
  remove(id: string): Promise<void>;
}

export interface BookTypeRepository {
  findAll(): Promise<BookType[]>; // per sortOrder, poi nome
  create(name: string): Promise<BookType>;
  rename(id: string, name: string): Promise<BookType>;
  remove(id: string): Promise<void>; // errore se builtin
}
```

Implementazioni: `SqliteBookRepository.ts`, `SqliteTagRepository.ts`, `SqliteBookTypeRepository.ts`, costruite da `createRepositories(db)` (`repositories.ts`, puro) e da `getRepositories()` (`appRepositories.ts`, sul database dell'app). I repository dipendono solo dall'interfaccia `SqlDatabase` (`SqlDatabase.ts`), un sottoinsieme dell'API di expo-sqlite: nei test la stessa interfaccia è implementata sopra `node:sqlite` in memoria.

Estensioni oltre l'interfaccia minima: `SqliteTagRepository.ensure(name)` e `SqliteBookTypeRepository.findByName(name)`, usate dai servizi di import.

Regole comuni:

- `create`/`update` ricevono `tags` come nomi; il repository crea i tag mancanti e aggiorna `book_tags` **nella stessa transazione**.
- `create`/`update` validano e normalizzano i dati (`normalizeNewBook`): titolo obbligatorio, ISBN convertito a 13 cifre, stato e fascia d'età nella lista, tag normalizzati. Errori: `ValidationError`, `InvalidIsbnError`, `DuplicateIsbnError` (con `existingBookId`), `NotFoundError`, `DuplicateNameError`, `BuiltinTypeError` (`errors.ts`).
- `remove` di un libro notifica `onBookRemoved(book)` (opzione del costruttore): il servizio copertine lo usa per cancellare il file locale. I tag non più usati restano disponibili per l'autocompletamento.
- `bulkUpsert` abbina per `id` e poi per `isbn`; con `replace` conserva la copertina locale esistente se quella in ingresso è assente; è atomico.
- `countBy` include sempre il gruppo "non indicato" (`key: null`) se ha almeno un libro.
- Gli errori SQL si propagano come eccezioni: li gestiscono gli hook, non le schermate.
- Ordinamento `author` usa il primo autore; `ageRange` segue l'ordine di `AGE_RANGES` con "non indicata" in coda.

### Accesso al database (`src/data/db.ts`)

`getDatabase(): Promise<SQLiteDatabase>` apre `libreria.db` una sola volta, imposta `foreign_keys` e `WAL`, e applica le migrazioni mancanti da `MIGRATIONS` (`src/data/migrations.ts`) in transazione.

## 4. Servizio metadati (`src/services/metadata/`)

```ts
export type MetadataSource = 'google_books' | 'open_library';

export interface BookMetadata {
  isbn: string;
  title: string;
  authors: string[];
  publisher?: string;
  publishedYear?: number;
  pageCount?: number;
  description?: string;
  coverUrl?: string;
  source: MetadataSource;
  suggestedTags?: string[]; // da categories/subjects: solo proposte (RF15)
}

export interface MetadataProvider {
  readonly source: MetadataSource;
  lookupByIsbn(isbn: string, signal?: AbortSignal): Promise<BookMetadata | null>;
}

export interface MetadataService {
  lookup(isbn: string): Promise<BookMetadata | null>; // mai eccezioni; null se offline/non trovato
}
```

### API esterne (sola lettura, senza chiave; verso di esse viaggia solo l'ISBN)

| Provider                 | Endpoint                                                                           | Campi usati                                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Google Books             | `GET https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`                    | `items[0].volumeInfo`: `title`, `authors`, `publisher`, `publishedDate` (anno), `pageCount`, `description`, `imageLinks.thumbnail` (forzato a https), `categories` → `suggestedTags` |
| Open Library             | `GET https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data` | `["ISBN:{isbn}"]`: `title`, `authors[].name`, `publishers[].name`, `publish_date` (anno), `number_of_pages`, `cover.large`, `subjects[].name` → `suggestedTags`                      |
| Open Library (copertina) | `GET https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg`                           | fallback copertina                                                                                                                                                                   |

Timeout complessivo: `METADATA_LOOKUP_TIMEOUT_MS = 5000`. Ordine: Google Books, poi Open Library.

Implementazioni: `GoogleBooksProvider.ts`, `OpenLibraryProvider.ts` (ricevono `fetch` iniettabile), `MetadataService.ts` (`FallbackMetadataService`: normalizza l'ISBN, verifica `isOnline`, prova i provider in ordine con un solo `AbortController` e timeout complessivo, registra gli errori con `onError` e restituisce sempre `null` in caso di problemi). `appMetadataService.ts` espone `getMetadataService()` cablato con NetInfo. `toBook.ts` (`metadataToBookFields`) converte il risultato nei soli campi bibliografici del form; i `suggestedTags` restano separati per la scelta dell'utente (RF15). Le categorie gerarchiche ("Juvenile Fiction / Animals") vengono spezzate e normalizzate in tag (massimo 10).

## 5. Formato export/import (`src/domain/export.ts`)

```ts
export interface LibraryExport {
  format: 'libreria-export';
  version: 1;
  exportedAt: string;
  bookTypes: BookType[]; // inclusi quelli creati dall'utente
  books: Array<
    Omit<Book, 'coverPath' | 'bookTypeId'> & {
      bookType: string | null; // per nome
      coverBase64?: string; // opzionale
    }
  >;
}
export type ImportStrategy = 'replace' | 'keep';
```

Nome file: `libreria-AAAA-MM-GG.json`. In import la corrispondenza è per `id`, poi per `isbn`; i tipi vengono abbinati per nome (case-insensitive) e creati se mancanti.

## 6. Mappa schermate (`app/`, expo-router)

| Route             | File                      | Schermata         | Azioni                                                                                                   |
| ----------------- | ------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| `/`               | `app/index.tsx`           | Lista libri       | ricerca; chip filtro stato / fascia d'età / tipo / tag; ordinamento; FAB "aggiungi" (manuale, scansione) |
| `/groups`         | `app/groups.tsx`          | Vista raggruppata | per fascia d'età o tipo con conteggi; tap apre `/` filtrata                                              |
| `/scan`           | `app/scan.tsx`            | Scanner           | legge EAN-13, avvisa se duplicato, apre `/book/new?isbn=`                                                |
| `/book/new`       | `app/book/new.tsx`        | Nuovo libro       | form; lookup metadati; selettore fascia d'età; selettore tipo; tag con autocompletamento; tag suggeriti  |
| `/book/[id]`      | `app/book/[id]/index.tsx` | Dettaglio         | classificazione in evidenza; stato, stelle, note, date; modifica; elimina                                |
| `/book/[id]/edit` | `app/book/[id]/edit.tsx`  | Modifica libro    | stesso form di `new`                                                                                     |
| `/settings`       | `app/settings/index.tsx`  | Impostazioni      | export, import, conteggio, info                                                                          |
| `/settings/tags`  | `app/settings/tags.tsx`   | Tag               | lista con conteggi, rinomina, elimina                                                                    |
| `/settings/types` | `app/settings/types.tsx`  | Tipi di libro     | aggiungi, rinomina, elimina (non builtin)                                                                |

Hook (`src/hooks/`): `useBooks(query)`, `useBook(id)`, `useBookCount()`, `useGroupCounts(field)`, `useBookMutations()` (create/update/remove; la copertina si scarica dopo il salvataggio), `useTags()`, `useTagSuggestions(prefix)`, `useTagMutations()`, `useBookTypes()` (con `nameById`), `useBookTypeMutations()`, `useMetadataLookup()`, `useExportImport()`. Le chiavi di cache sono in `queryKeys.ts`; ogni mutazione invalida libri, tag e tipi coinvolti.

Parametri di navigazione (convertiti da `parseBookQueryParams` / `bookQueryToParams` in `src/domain/bookQueryParams.ts`): `/book/new?isbn=9780306406157`; `/?ageRange=3-5&bookTypeId=albo_illustrato&tags=buonanotte`.

## 7. Tracciabilità requisiti → interfacce

| Req      | Dove viene realizzato                                                               |
| -------- | ----------------------------------------------------------------------------------- |
| RF1      | `/book/new`, `BookRepository.create`                                                |
| RF2      | `/scan`, `useScanner`, `normalizeIsbn`                                              |
| RF3      | `MetadataService.lookup`, provider Google Books / Open Library, `useMetadataLookup` |
| RF4, RF5 | `Book.status/rating/notes/startedAt/finishedAt`, `/book/[id]`                       |
| RF6      | `BookQuery`, `BookRepository.findAll`, `/`                                          |
| RF7      | `BookRepository.update/remove`, `/book/[id]/edit`                                   |
| RF8      | `LibraryExport`, `exportLibrary`, `/settings`                                       |
| RF9      | `isLibraryExport`, `BookRepository.bulkUpsert`, `/settings`                         |
| RF10     | `BookRepository.findByIsbn`, `/scan`, `/book/new`                                   |
| RF11     | `AgeRange`, `Book.ageRange`, `BookQuery.ageRange`                                   |
| RF12     | `BookType`, `BookTypeRepository`, `BUILTIN_BOOK_TYPES`, `/settings/types`           |
| RF13     | `Tag`, `TagRepository`, `normalizeTagName`, `/settings/tags`                        |
| RF14     | `BookRepository.countBy`, `/groups`                                                 |
| RF15     | `BookMetadata.suggestedTags`, `/book/new`                                           |
| RNF5     | `MIGRATIONS`, `getDatabase`                                                         |
