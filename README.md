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

Prima versione funzionante completa:

- **Dati**: repository SQLite con migrazioni, ricerca, filtri, ordinamenti e conteggi.
- **Servizi**: metadati online (Google Books con fallback Open Library), copertine locali, export/import JSON.
- **Interfaccia**: lista con ricerca, filtri per stato, fascia d'età, tipo e tag e ordinamento; vista per gruppo; scanner ISBN con controllo duplicati; form con ricerca online, classificazione e tag suggeriti; dettaglio con cambio rapido di stato e stelle; impostazioni con export/import e gestione di tag e tipi. Tema chiaro e scuro.
- **Test**: dominio, dati e servizi su SQLite reale in memoria; componenti e schermate con React Native Testing Library.

Da provare su un telefono reale: fotocamera, condivisione e selettore file, chiamate reali alle API dei metadati.
