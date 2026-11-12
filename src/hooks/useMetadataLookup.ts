import { useMutation } from '@tanstack/react-query';

import { useServices } from './ServicesContext';

/** Ricerca online per ISBN (RF3). `mutate(isbn)`; `data` è `BookMetadata | null`, mai un errore. */
export function useMetadataLookup() {
  const { metadata } = useServices();
  return useMutation({ mutationFn: (isbn: string) => metadata.lookup(isbn) });
}
