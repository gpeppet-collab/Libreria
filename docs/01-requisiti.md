# 01 · Requisiti

**Progetto:** Libreria, catalogo personale di libri su Android
**Versione documento:** 1.1 (2026-11-14)
**Stato:** approvato per la v1

## 1. Scopo e contesto

Libreria è un'app Android che permette a una sola persona di catalogare i libri che possiede, in prevalenza **libri per bambini**, e di tenerne traccia nel tempo. L'app funziona interamente in locale sul telefono: non richiede account, non ha un server proprio e usa la rete solo, facoltativamente, per recuperare i dati di un libro a partire dall'ISBN.

### Obiettivi

- Aggiungere un libro in pochi secondi inquadrando il codice a barre.
- Classificare i libri in modo utile per una famiglia: fascia d'età, tipo di libro, tag liberi.
- Sapere cosa si possiede, cosa è stato letto e cosa è piaciuto.
- Non perdere mai i dati: export e import su file.

### Fuori perimetro (v1)

Scaffali/collezioni, backup cloud, iOS, multiutente, sincronizzazione tra dispositivi, prestiti.

## 2. Attori

| Attore             | Descrizione                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Lettore / genitore | L'unica persona che usa l'app. Nessun login, nessun ruolo.                                         |
| Servizi metadati   | Google Books, OPAC SBN e Open Library, interrogati in sola lettura con l'ISBN o il titolo cercato. |

## 3. Requisiti funzionali

| ID   | Requisito                                                                                                                                                                                                                                                                                                            | Priorità |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| RF1  | Inserire un libro manualmente: titolo (obbligatorio), autori, ISBN, editore, anno, pagine, copertina, descrizione.                                                                                                                                                                                                   | Must     |
| RF2  | Aggiungere un libro scansionando il codice a barre EAN-13/ISBN con la fotocamera.                                                                                                                                                                                                                                    | Must     |
| RF3  | Se c'è connessione, dopo la scansione (o digitando un ISBN) proporre titolo, autori, copertina e altri dati interrogando insieme Google Books, OPAC SBN e Open Library e unendo i risultati. L'utente conferma o modifica prima del salvataggio. Senza rete si passa all'inserimento manuale senza errori bloccanti. | Must     |
| RF4  | Stato di lettura per ogni libro: `da_leggere`, `in_lettura`, `letto`, `abbandonato`; date di inizio e fine lettura opzionali.                                                                                                                                                                                        | Must     |
| RF5  | Valutazione da 1 a 5 stelle e note personali in testo libero.                                                                                                                                                                                                                                                        | Must     |
| RF6  | Lista libri con ricerca testuale su titolo/autore/ISBN e filtri combinabili per stato, fascia d'età, tipo e tag; ordinamento per titolo, autore, data inserimento, fascia d'età.                                                                                                                                     | Must     |
| RF7  | Modificare ed eliminare un libro (eliminazione con conferma).                                                                                                                                                                                                                                                        | Must     |
| RF8  | Esportare l'intero catalogo in un file JSON condivisibile con le app del telefono (share sheet), classificazione e tag inclusi.                                                                                                                                                                                      | Must     |
| RF9  | Importare un file JSON esportato dall'app: unione per id/ISBN con scelta "sostituisci" o "mantieni esistente".                                                                                                                                                                                                       | Must     |
| RF10 | Rilevare i duplicati per ISBN in fase di inserimento e avvisare.                                                                                                                                                                                                                                                     | Must     |
| RF11 | **Fascia d'età**: ogni libro ha una fascia d'età scelta da una lista fissa (`0-2`, `3-5`, `6-8`, `9-12`, `13+`, `adulti`) oppure "non indicata".                                                                                                                                                                     | Must     |
| RF12 | **Tipo/genere**: ogni libro ha un tipo scelto da una lista predefinita ma estendibile dall'utente: albo illustrato, libro cartonato, fiaba/favola, primo lettore, romanzo per ragazzi, fumetto, poesia/filastrocche, libro gioco/attività, divulgazione, didattico/scolastico, romanzo, saggio, altro.               | Must     |
| RF13 | **Tag liberi**: zero o più tag per libro (es. "animali", "dinosauri", "buonanotte", "scuola", "regalo nonna"); autocompletamento sui tag già usati; rinomina ed eliminazione tag dalle impostazioni.                                                                                                                 | Must     |
| RF14 | Dalla lista si può aprire una vista raggruppata per fascia d'età o per tipo, con il conteggio dei libri per gruppo; toccando un gruppo si apre la lista filtrata.                                                                                                                                                    | Should   |
| RF15 | Quando il recupero online restituisce categorie (Google Books `categories`, Open Library `subjects`), proporle come tag spuntabili, senza applicarle automaticamente.                                                                                                                                                | Should   |
| RF16 | **Ricerca per titolo**: cercare online per titolo e autore, vedere i risultati di tutte le fonti senza doppioni e scegliere quello giusto, che compila il form. Serve per i libri senza codice o non trovati dall'ISBN.                                                                                              | Must     |
| RF17 | **Copertina da foto**: scattare una foto o scegliere un'immagine dalla galleria come copertina, con ritaglio; rimuovere la copertina. L'immagine scelta prevale su quelle online.                                                                                                                                    | Must     |
| RF18 | **Esito della ricerca visibile**: dopo ogni ricerca online il form mostra cosa ha risposto ciascuna fonte (trovato, non trovato, limite richieste, errore, nessuna risposta).                                                                                                                                        | Should   |
| RF19 | **Chiave Google facoltativa**: nelle impostazioni si può salvare una chiave API personale di Google Books, che resta solo sul telefono.                                                                                                                                                                              | Should   |
| RF20 | **Libri non classificati**: la vista per gruppo e i filtri permettono di vedere i libri senza fascia d'età o senza tipo.                                                                                                                                                                                             | Should   |
| RF21 | **Gestione tag completa**: aggiungere un tag dalle impostazioni; nel form i tag esistenti sono visibili e selezionabili senza scrivere.                                                                                                                                                                              | Must     |
| RF22 | **Tema**: scegliere tra chiaro, scuro o come il telefono; la scelta resta salvata.                                                                                                                                                                                                                                   | Should   |
| RF23 | **Date dal calendario**: le date di lettura si scelgono dal calendario di sistema, non si scrivono; non sono ammesse date future né una fine precedente all'inizio.                                                                                                                                                  | Should   |

## 4. Requisiti non funzionali

| ID   | Requisito                                                                                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF1 | Funziona completamente offline; la rete serve solo per RF3 ed è sempre facoltativa.                                                                                                                  |
| RNF2 | Nessuna autenticazione, nessun dato inviato a server propri; verso Google Books, OPAC SBN e Open Library viaggiano solo l'ISBN o il testo cercato (più la chiave Google, se configurata).            |
| RNF3 | Android 8+ (API 26+); build con EAS Build o `expo run:android`; distribuzione via APK.                                                                                                               |
| RNF4 | Lista fluida fino ad almeno 5.000 libri (lista virtualizzata, query SQL indicizzate).                                                                                                                |
| RNF5 | Migrazioni di schema versionate: aggiornare l'app non perde dati.                                                                                                                                    |
| RNF6 | Lingua interfaccia: italiano; stringhe centralizzate, pronte per i18n.                                                                                                                               |
| RNF7 | Copertine salvate in locale nel file system dell'app, non solo come URL remoto.                                                                                                                      |
| RNF8 | TypeScript strict, lint, test unitari su dominio e repository.                                                                                                                                       |
| RNF9 | Permessi Android: `CAMERA` (scanner e foto della copertina), chiesto al primo uso, più `INTERNET` e `VIBRATE`, che Android concede senza chiedere. Microfono e archivio sono esclusi esplicitamente. |

## 5. User story

- **US1** Come genitore, voglio inquadrare il barcode di un libro appena comprato e vederlo comparire nel catalogo con copertina e autore, per non doverlo digitare.
- **US2** Come genitore, voglio indicare per ogni libro la fascia d'età e il tipo, per ritrovare rapidamente cosa è adatto a ciascun figlio.
- **US3** Come genitore, voglio vedere tutti i libri per la fascia 3-5 anni con tag "buonanotte", per scegliere cosa leggere stasera.
- **US4** Come genitore, voglio sapere quanti albi illustrati e quanti primi lettori abbiamo, per capire cosa manca in casa.
- **US5** Come lettore, voglio segnare un libro come "in lettura" e poi "letto" con una valutazione, per tenere traccia di cosa ho letto.
- **US6** Come lettore, voglio cercare rapidamente un titolo per sapere se lo possiedo già, anche in libreria senza rete.
- **US7** Come lettore, voglio esportare tutto in un file per non perdere i dati cambiando telefono.
- **US8** Come genitore, voglio aggiungere un vecchio libro senza codice a barre cercandolo per titolo e fotografandone la copertina.
- **US9** Come genitore, voglio vedere quali libri non ho ancora classificato per fascia d'età, per completarli.

## 6. Criteri di accettazione (estratto)

| Requisito  | Criterio                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF2, RF3   | Scansionando un ISBN valido con rete attiva, entro 5 secondi il form mostra titolo e autori precompilati; senza rete il form si apre vuoto con l'ISBN già inserito, senza messaggi di errore bloccanti. |
| RF10       | Scansionando un ISBN già in catalogo compare un avviso con il link al libro esistente; l'inserimento non viene duplicato.                                                                               |
| RF6        | Con filtri "fascia 3-5" + tag "buonanotte" la lista mostra solo i libri che hanno entrambi; la ricerca "dino" trova "Dinosauri" nel titolo.                                                             |
| RF11, RF12 | Il form non permette di salvare una fascia d'età fuori dalla lista; i tipi predefiniti non si possono eliminare dalle impostazioni.                                                                     |
| RF13       | Digitando "din" nel campo tag compare il suggerimento "dinosauri" se già usato; rinominando un tag in un nome esistente i due vengono uniti.                                                            |
| RF8, RF9   | Esportando e reimportando su un'installazione pulita con strategia "sostituisci" si ottiene lo stesso numero di libri, con tipi, tag e stati identici.                                                  |
| RNF5       | Aggiornando l'app da una versione precedente i libri restano visibili e le nuove colonne sono presenti.                                                                                                 |

## 7. Tracciabilità

La tabella requisito → schermata/interfaccia è in [03-interfacce.md](03-interfacce.md#7-tracciabilità-requisiti--interfacce).
