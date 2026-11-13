# ADR-0003 · Metadati online come funzione best-effort

**Stato:** accettata · **Data:** 2026-11-11

## Contesto

L'app deve funzionare offline (RNF1) ma inserire un libro a mano è lento. Da un ISBN si possono ottenere titolo, autori e copertina da servizi pubblici. Alternative: nessun lookup, un solo provider, più provider con fallback, un proprio backend proxy.

## Decisione

Lookup diretto dal telefono verso **Google Books** e, in fallback, **Open Library**, senza chiavi API e senza server proprio. Il lookup è sempre facoltativo: qualsiasi errore o assenza di rete produce `null` e la UI prosegue con l'inserimento manuale. Le categorie restituite diventano **tag suggeriti**, mai applicati in automatico (RF15).

## Motivazioni

- Nessun backend da mantenere, nessun costo, nessun account.
- Due provider aumentano la copertura dei libri italiani per bambini, spesso assenti da uno dei due.
- Verso i provider viaggia solo l'ISBN: nessun dato personale (RNF2).
- I dati scaricati vengono salvati in locale, copertina inclusa (RNF7): dopo il primo inserimento la rete non serve più.

## Conseguenze

- I limiti di quota non autenticata di Google Books sono accettabili per un uso personale; se superati si ricade su Open Library.
- La qualità dei dati va sempre confermata dall'utente nel form prima del salvataggio.
- Un timeout complessivo di 5 secondi evita attese lunghe con rete scarsa.

## Aggiornamento 2026-11-13: più fonti unite e chiave Google facoltativa

Le prove sul telefono hanno mostrato molti libri non trovati e copertine mancanti. Cause accertate: senza chiave Google Books usa una quota anonima condivisa, spesso esaurita (HTTP 429), e Open Library copre poco l'editoria italiana; inoltre il suo indirizzo di copertina per ISBN restituiva un'immagine vuota quando la copertina non esiste.

Decisioni:

- Le fonti si interrogano **in parallelo** entro 10 secondi e i risultati si **uniscono**: la prima fonte in ordine di preferenza (Google Books, OPAC SBN, Open Library) fa da base, le altre riempiono i campi mancanti.
- Si aggiunge **OPAC SBN**, il catalogo del Servizio Bibliotecario Nazionale, per i libri italiani.
- Google Books accetta una **chiave API personale facoltativa**, salvata solo sul telefono (tabella `settings`), e riprova con l'ISBN come testo quando la ricerca per ISBN è vuota.
- Il form mostra l'**esito per fonte** (trovato, non trovato, limite richieste, errore, nessuna risposta).
- Copertine: lista di candidati provati in ordine, download nativo con ripiego su `fetch`, scarto dei file minuscoli; se nessun download riesce resta l'URL remoto, e l'immagine che non si carica lascia il segnaposto.
