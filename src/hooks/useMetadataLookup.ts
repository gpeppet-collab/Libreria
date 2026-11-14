import { useMutation } from '@tanstack/react-query';

import { useServices } from './ServicesContext';

/** Ricerca online per ISBN (RF3). `mutate(isbn)`; `data` è un `LookupResult`, mai un errore. */
export function useMetadataLookup() {
  const { metadata } = useServices();
  return useMutation({ mutationFn: (isbn: string) => metadata.lookupDetailed(isbn) });
}

/** Ricerca online per titolo e/o autore (RF16). `data` è un `SearchResult`, mai un errore. */
export function useMetadataSearch() {
  const { metadata } = useServices();
  return useMutation({ mutationFn: (text: string) => metadata.searchByText(text) });
}
