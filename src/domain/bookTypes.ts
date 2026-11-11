import type { BookType } from './types';

/**
 * Tipi di libro predefiniti (RF12). Vengono inseriti dalla migrazione 1.
 * Gli id sono slug stabili: non rinominarli, aggiungere solo in coda.
 */
export const BUILTIN_BOOK_TYPES: readonly BookType[] = [
  { id: 'albo_illustrato', name: 'Albo illustrato', builtin: true, sortOrder: 10 },
  { id: 'cartonato', name: 'Libro cartonato', builtin: true, sortOrder: 20 },
  { id: 'fiaba', name: 'Fiaba / favola', builtin: true, sortOrder: 30 },
  { id: 'primo_lettore', name: 'Primo lettore', builtin: true, sortOrder: 40 },
  { id: 'romanzo_ragazzi', name: 'Romanzo per ragazzi', builtin: true, sortOrder: 50 },
  { id: 'fumetto', name: 'Fumetto', builtin: true, sortOrder: 60 },
  { id: 'poesia', name: 'Poesia / filastrocche', builtin: true, sortOrder: 70 },
  { id: 'gioco_attivita', name: 'Libro gioco / attività', builtin: true, sortOrder: 80 },
  { id: 'divulgazione', name: 'Divulgazione', builtin: true, sortOrder: 90 },
  { id: 'didattico', name: 'Didattico / scolastico', builtin: true, sortOrder: 100 },
  { id: 'romanzo', name: 'Romanzo', builtin: true, sortOrder: 110 },
  { id: 'saggio', name: 'Saggio', builtin: true, sortOrder: 120 },
  { id: 'altro', name: 'Altro', builtin: true, sortOrder: 999 },
];
