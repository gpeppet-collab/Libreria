# Libreria

Catalogo personale di libri per Android, pensato per una famiglia con molti libri per bambini. Funziona interamente in locale sul telefono, senza account e senza server: i dati stanno in un database SQLite nell'app e si possono esportare in un file.

Funzioni: scansione del codice ISBN, recupero facoltativo dei dati del libro da Google Books / Open Library, stato di lettura, valutazione e note, classificazione per **fascia d'età**, **tipo di libro** e **tag liberi**, ricerca e filtri, export/import JSON.

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

## Generare l'APK (gratis, anche dal telefono)

Il flusso GitHub Actions `.github/workflows/android-apk.yml` compila l'APK sui server di GitHub, senza EAS né Android Studio:

1. su GitHub apri la scheda **Actions**, scegli **APK Android** e premi **Run workflow**;
2. a esecuzione finita (circa 15-20 minuti) apri l'esecuzione e scarica **libreria-apk** dalla sezione Artifacts;
3. estrai lo zip e installa il file `.apk`, consentendo l'installazione da origini sconosciute.

L'APK è firmato con la chiave di debug: va bene per il proprio telefono, non per il Play Store.

## Anteprima web

Per provare l'interfaccia senza telefono, in due terminali:

```bash
npm run web           # server di sviluppo Expo sulla porta 8081
npm run web:preview   # proxy con le intestazioni di isolamento → http://localhost:8082
```

Il proxy serve perché expo-sqlite sul web usa SharedArrayBuffer, che richiede le intestazioni COOP/COEP. Sul web i file passano da un adapter per browser: le copertine scaricate restano URL remoti, l'export scarica il file JSON e l'import usa il selettore del browser. Lo scanner non è disponibile: si inserisce l'ISBN a mano e si usa "Cerca online".

## Stato

Versione 0.6.0, in uso su telefono reale.

- **Catalogo**: lista con ricerca, filtri (stato, fascia d'età, tipo, tag, non classificati) e ordinamento; vista per gruppo; dettaglio con cambio rapido di stato e stelle.
- **Inserimento**: scanner ISBN con controllo duplicati; ricerca online per ISBN o per titolo su Google Books, OPAC SBN e Open Library con esito per fonte; copertina online, da foto o dalla galleria; date dal calendario; tag esistenti selezionabili.
- **Impostazioni**: export/import JSON, tema chiaro/scuro, chiave Google Books facoltativa, gestione di tag e tipi.
- **Test**: dominio, dati e servizi su SQLite reale in memoria; componenti e schermate con React Native Testing Library.

Da fare: misura delle prestazioni con migliaia di libri, firma dell'APK con chiave propria per un'eventuale pubblicazione.
