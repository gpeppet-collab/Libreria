# hooks

Hook React che collegano le schermate ai repository e ai servizi tramite TanStack Query.
Previsti: `useBooks(query)`, `useBook(id)`, `useBookMutations()`, `useTags()`, `useBookTypes()`, `useScanner()`, `useMetadataLookup()`, `useExportImport()`.
Le chiavi di cache sono centralizzate in `queryKeys.ts`.
