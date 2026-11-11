# ADR-0002 · SQLite locale con SQL esplicito e migrazioni versionate

**Stato:** accettata · **Data:** 2026-11-11

## Contesto

I dati devono vivere solo sul telefono, senza server. Il catalogo può crescere a qualche migliaio di libri e richiede ricerca testuale, filtri combinati e una relazione molti-a-molti (libri ↔ tag). Alternative valutate: AsyncStorage/JSON su file, SQLite con ORM (Drizzle, WatermelonDB), SQLite con SQL esplicito.

## Decisione

**expo-sqlite** con SQL scritto a mano dentro un layer di repository, e migrazioni versionate in `src/data/migrations.ts`.

## Motivazioni

- Query con JOIN, indici e `COUNT` raggruppati sono naturali in SQL e inefficienti su un file JSON.
- Niente ORM: meno dipendenze, nessuna generazione di codice, schema leggibile direttamente nel documento di architettura.
- Le migrazioni versionate garantiscono che un aggiornamento dell'app non perda dati (RNF5).

## Conseguenze

- Il mapping riga ↔ oggetto è scritto a mano nei repository; va coperto da test con database in memoria.
- Se il numero di query crescesse molto, Drizzle resta adottabile sopra lo stesso schema senza cambiare le interfacce dei repository.
- `authors` è salvato come JSON array in una colonna di testo: scelta pragmatica, non si prevede di interrogare per singolo autore con indici.
