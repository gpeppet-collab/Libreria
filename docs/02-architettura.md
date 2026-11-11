# 02 · Architettura

**Versione documento:** 1.0 (2026-11-11)
Decisioni motivate negli ADR in [docs/adr](adr/).

## 1. Vista d'insieme

Libreria è un'app **Android**, **locale**, **a singolo utente**. Non c'è backend: tutta la logica gira sul telefono e i dati vivono in un database SQLite nella sandbox dell'app. L'unica comunicazione esterna è una richiesta HTTP facoltativa verso i servizi metadati quando si inserisce un ISBN.

```
┌──────────────────────── Telefono Android ────────────────────────┐
│                                                                  │
│   app/  (schermate expo-router)                                  │
│      │                                                           │
│   src/hooks/  (TanStack Query: cache, invalidazione)             │
│      │                                                           │
│   src/services/            src/data/                             │
│   metadata · covers ·      repositories su SQLite                │
│   exportImport · scanner        │                                │
│      │                     expo-sqlite  ──►  libreria.db         │
│   src/domain/  (tipi e regole pure, nessuna dipendenza Expo)     │
│                                                                  │
└────────────┬──────────────────────────────────────────┬──────────┘
             │ solo ISBN, solo se online                │ share sheet
             ▼                                          ▼
   Google Books / Open Library                  file JSON di export
```

## 2. Stack

| Area        | Scelta                                                      | Motivo                                                              |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Runtime     | Expo SDK 58, React Native 0.88, React 19, TypeScript strict | un solo linguaggio, build Android senza toolchain nativa (ADR-0001) |
| Navigazione | expo-router (file-based, typed routes)                      | route = file, deep link gratis                                      |
| Persistenza | expo-sqlite con SQL esplicito, migrazioni versionate        | leggero, trasparente, testabile (ADR-0002)                          |
| Scanner     | expo-camera (barcode EAN-13)                                | modulo ufficiale Expo                                               |
| File        | expo-file-system, expo-sharing, expo-document-picker        | export/import e copertine locali                                    |
| Rete        | fetch + @react-native-community/netinfo                     | tentare il lookup solo se online (ADR-0003)                         |
| Stato       | TanStack Query sopra i repository                           | cache e invalidazione senza store globale                           |
| Id          | expo-crypto `randomUUID()`                                  | id stabili anche attraverso export/import                           |
| Qualità     | ESLint (eslint-config-expo), Prettier, Jest (jest-expo)     | RNF8                                                                |

## 3. Livelli e regola di dipendenza

```
app/            schermate: solo UI e navigazione, nessun SQL, nessun fetch
src/hooks/      collegano schermate a repository e servizi (TanStack Query)
src/services/   metadata (provider + fallback), covers, exportImport, scanner
src/data/       db.ts (apertura + migrazioni), repository SQLite
src/domain/     tipi, costanti e regole pure (ISBN, tag, formato export)
src/ui/         componenti riusabili senza accesso ai dati
```

**Regola:** `app → hooks → services | data → domain`. Il livello `domain` non importa nulla da React, React Native o Expo (vincolo applicato da ESLint in `eslint.config.js`), quindi è testabile in puro Node. Le schermate non toccano mai direttamente SQLite o `fetch`.

## 4. Modello dati

### Entità

- **Book**: il libro, con dati bibliografici, stato di lettura, valutazione, note, fascia d'età e tipo.
- **BookType**: tipo/genere. Lista predefinita (`builtin = 1`, non eliminabile) più voci create dall'utente.
- **Tag**: etichetta libera, nome unico case-insensitive. Relazione molti-a-molti con Book.
- **AgeRange**: non è una tabella ma una lista fissa nel dominio (`0-2`, `3-5`, `6-8`, `9-12`, `13+`, `adulti`); cambia solo con una release.

### Schema SQLite (migrazione 1)

```sql
CREATE TABLE book_types (
  id         TEXT PRIMARY KEY,                 -- slug ('albo_illustrato') o uuid
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  builtin    INTEGER NOT NULL DEFAULT 0,       -- 1 = predefinito, non eliminabile
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE books (
  id             TEXT PRIMARY KEY,             -- uuid
  isbn           TEXT,                         -- 13 cifre, NULL se assente
  title          TEXT NOT NULL,
  authors        TEXT NOT NULL DEFAULT '[]',   -- JSON array di stringhe
  publisher      TEXT,
  published_year INTEGER,
  page_count     INTEGER,
  description    TEXT,
  cover_path     TEXT,                         -- path locale
  status         TEXT NOT NULL DEFAULT 'da_leggere',
  rating         INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes          TEXT,
  started_at     TEXT,                         -- ISO 8601
  finished_at    TEXT,
  age_range      TEXT,                         -- vedi AgeRange, NULL = non indicata
  book_type_id   TEXT REFERENCES book_types(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_books_isbn      ON books(isbn) WHERE isbn IS NOT NULL;
CREATE INDEX        idx_books_title     ON books(title COLLATE NOCASE);
CREATE INDEX        idx_books_status    ON books(status);
CREATE INDEX        idx_books_age_range ON books(age_range);
CREATE INDEX        idx_books_type      ON books(book_type_id);

CREATE TABLE tags (
  id         TEXT PRIMARY KEY,                 -- uuid
  name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL
);
CREATE TABLE book_tags (
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (book_id, tag_id)
);
CREATE INDEX idx_book_tags_tag ON book_tags(tag_id);

CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
```

La migrazione 1 inserisce anche i tipi predefiniti elencati in `src/domain/bookTypes.ts`. All'apertura: `PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL`.

### Migrazioni

`src/data/migrations.ts` contiene un array ordinato di migrazioni `{ version, statements[] }`. `src/data/migrate.ts` (`runMigrations`) legge `MAX(version)` da `schema_migrations` e applica in transazione le migrazioni mancanti; `src/data/db.ts` apre il database dell'app una sola volta e la invoca. Una migrazione pubblicata non si modifica mai: se ne aggiunge una nuova.

## 5. Flussi principali

### 5.1 Aggiunta da scansione (RF2, RF3, RF10, RF15)

1. `/scan` apre `expo-camera` con filtro barcode EAN-13.
2. Al primo codice letto, `normalizeIsbn()` (domain) lo valida e lo converte in ISBN-13; se non valido, la schermata mostra "codice non riconosciuto" e continua.
3. `BookRepository.findByIsbn()`: se esiste, avviso con link al libro esistente e stop.
4. Se `netinfo` dice online, `MetadataService.lookup(isbn)` con timeout 5 s: prova Google Books, poi Open Library; qualsiasi errore produce `null`, mai un'eccezione.
5. Navigazione a `/book/new?isbn=…` con il form precompilato; `suggestedTags` mostrati come chip spuntabili; l'utente sceglie fascia d'età e tipo.
6. Salvataggio in transazione (libro + tag); la copertina viene scaricata in background da `covers` in `documentDirectory/covers/<id>.jpg` e il path aggiornato sul libro.

### 5.2 Lista, filtri, raggruppamento (RF6, RF14)

La schermata `/` tiene un `BookQuery` in stato locale; `useBooks(query)` lo passa a `BookRepository.findAll()`, che costruisce **una sola query SQL** (JOIN su `book_tags` solo se ci sono tag, con `HAVING COUNT(DISTINCT tag) = n` per il filtro AND). `/groups` usa `countBy('ageRange' | 'bookType')` e, al tocco, naviga a `/` con il filtro corrispondente.

### 5.3 Export (RF8)

`ExportImportService.exportLibrary()` legge tutti i libri e i tipi, legge le copertine locali in base64 tramite `CoverService`, serializza un `LibraryExport` v1 (tipo e tag per nome) con `buildLibraryExport`, scrive `libreria-AAAA-MM-GG.json` nella cache e apre lo share sheet. Tutto l'accesso a file, condivisione e selettore passa dalla porta `FilePort` (adapter `ExpoFilePort`), così i servizi si testano con un file system in memoria.

### 5.4 Import (RF9)

`pickImportFile()` (selettore → lettura → `parseLibraryExport`) produce un'anteprima con totale, nuovi, esistenti e tipi da creare; l'utente sceglie la strategia; `applyImport()` crea i tipi mancanti, chiama `BookRepository.bulkUpsert(books, strategy)` in una sola transazione (corrispondenza per `id` oppure per `isbn`) e salva le copertine incluse nel file. Esito riepilogato: inseriti / sostituiti / saltati.

## 6. Gestione errori e offline

- Rete: `MetadataService` non lancia mai; restituisce `null` e la UI prosegue in manuale.
- Database: errori di apertura/migrazione bloccano l'app con una schermata esplicativa (`app/_layout.tsx`); errori sulle singole operazioni vengono mostrati come toast e loggati.
- Fotocamera: permesso negato → messaggio con link alle impostazioni di sistema; l'inserimento manuale resta disponibile.

## 7. Sicurezza e privacy

Nessun account, nessun server proprio, nessuna telemetria. Verso Google Books e Open Library viaggia solo l'ISBN in chiaro su HTTPS. Il database vive nella sandbox dell'app; l'export è un file in chiaro sotto il controllo dell'utente.

## 8. Build e distribuzione

- Sviluppo: `npx expo start` con **development build** (expo-camera e expo-sqlite richiedono moduli nativi; Expo Go può non bastare).
- Build Android: `npx expo run:android` in locale oppure EAS Build (`eas build -p android --profile preview` per un APK installabile).
- Le cartelle `android/` e `ios/` sono generate (Continuous Native Generation) e non vengono versionate.

## 9. Test

| Livello    | Cosa                                      | Strumento                     |
| ---------- | ----------------------------------------- | ----------------------------- |
| Unit       | `domain/*` (ISBN, tag, formato export)    | Jest, puro Node               |
| Unit       | repository SQLite con database in memoria | jest-expo + expo-sqlite       |
| Unit       | provider metadati con `fetch` mockato     | Jest                          |
| Componenti | form, filtri, lista                       | @testing-library/react-native |
| Manuale    | scansione, permessi, share sheet          | dispositivo reale             |
