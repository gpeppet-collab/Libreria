# exportImport

Servizio per RF8/RF9. Da implementare:

- `exportLibrary(): Promise<string>`: legge tutto dai repository, costruisce un `LibraryExport` (vedi `src/domain/export.ts`), scrive `libreria-AAAA-MM-GG.json` nella cache dir con `expo-file-system` e lo condivide con `expo-sharing`.
- `pickAndParseImport(): Promise<LibraryExport | null>`: apre `expo-document-picker`, legge il file, valida con `isLibraryExport`.
- `applyImport(data, strategy)`: delega a `BookRepository.bulkUpsert` dopo aver creato i tipi mancanti.
