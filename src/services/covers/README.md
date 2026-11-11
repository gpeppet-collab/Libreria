# covers

Salvataggio locale delle copertine (RNF7). Da implementare:

- `downloadCover(url, bookId): Promise<string | null>`: scarica in `documentDirectory/covers/<bookId>.jpg` e restituisce il path; null in caso di errore (mai eccezioni verso la UI).
- `deleteCover(path)`: chiamato da `BookRepository.remove`.
