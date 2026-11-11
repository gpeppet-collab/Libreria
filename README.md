# Libreria

Catalogo personale di libri per Android, pensato per una famiglia con molti libri per bambini. Funziona interamente in locale sul telefono, senza account e senza server: i dati stanno in un database SQLite nell'app e si possono esportare in un file.

Funzioni della prima versione: scansione del codice ISBN, recupero facoltativo dei dati del libro da Google Books / Open Library, stato di lettura, valutazione e note, classificazione per **fascia d'età**, **tipo di libro** e **tag liberi**, ricerca e filtri, export/import JSON.

## Documentazione di progetto

| Documento                                          | Contenuto                                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [docs/01-requisiti.md](docs/01-requisiti.md)       | requisiti funzionali e non funzionali, user story, criteri di accettazione                     |
| [docs/02-architettura.md](docs/02-architettura.md) | livelli, stack, schema dati, flussi, build                                                     |
| [docs/03-interfacce.md](docs/03-interfacce.md)     | tipi di dominio, repository, servizio metadati, formato export, mappa schermate, tracciabilità |
| [docs/adr/](docs/adr/)                             | decisioni architetturali (Expo, SQLite, metadati online)                                       |

## Struttura

```
app/            schermate (expo-router)
src/domain/     tipi e regole pure, senza dipendenze da Expo
src/data/       database SQLite, migrazioni, interfacce repository
src/services/   metadati online, copertine, export/import
src/hooks/      collegamento schermate ↔ dati (TanStack Query)
src/ui/         componenti riusabili
docs/           documentazione
```

## Stack

Expo SDK 58 · React Native · TypeScript strict · expo-router · expo-sqlite · expo-camera · TanStack Query · Jest · ESLint · Prettier.

## Avvio

```bash
npm install
npm run check          # typecheck + lint + prettier + test
npx expo start         # server di sviluppo
npx expo run:android   # build e installazione su dispositivo/emulatore Android
```

Il progetto usa moduli nativi (fotocamera, SQLite), quindi serve una **development build** (`npx expo run:android` oppure EAS Build); Expo Go può non bastare. Per un APK installabile: `npx eas-cli build -p android --profile preview`.

## Stato

Definizione completata (documenti, interfacce, schema SQL, schermate stub) e **repository SQLite implementati e testati** (libri con ricerca, filtri, ordinamenti e conteggi; tag con unione in rinomina; tipi di libro). I test dei repository girano su un vero SQLite in memoria tramite `node:sqlite`. Servizio metadati implementato (Google Books con fallback Open Library, timeout, offline-safe, tag suggeriti). Prossimi passi: servizi copertine ed export/import, hook e schermate (vedi la tracciabilità in `docs/03-interfacce.md`).
