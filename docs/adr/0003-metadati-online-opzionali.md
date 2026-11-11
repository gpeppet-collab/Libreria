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
