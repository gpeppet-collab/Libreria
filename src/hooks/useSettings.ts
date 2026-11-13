import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServices } from './ServicesContext';

/** Legge e salva un'impostazione dell'app. */
export function useSetting(key: string) {
  const { repos } = useServices();
  const qc = useQueryClient();
  const queryKey = ['settings', key] as const;
  const query = useQuery({ queryKey, queryFn: () => repos.settings.get(key) });
  const save = useMutation({
    mutationFn: async (value: string | null) => {
      await repos.settings.set(key, value);
      await qc.invalidateQueries({ queryKey });
    },
  });
  return { value: query.data ?? null, isLoading: query.isLoading, save };
}
