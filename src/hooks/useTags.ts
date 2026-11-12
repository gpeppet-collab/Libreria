import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { normalizeTagName } from '@/domain/tags';

import { queryKeys } from './queryKeys';
import { useServices } from './ServicesContext';

export function useTags() {
  const { repos } = useServices();
  return useQuery({ queryKey: queryKeys.tags.all, queryFn: () => repos.tags.findAll() });
}

export function useTagSuggestions(prefix: string) {
  const { repos } = useServices();
  const p = normalizeTagName(prefix);
  return useQuery({
    queryKey: queryKeys.tags.suggest(p),
    queryFn: () => repos.tags.suggest(p, 8),
    enabled: p.length > 0,
  });
}

export function useTagMutations() {
  const { repos } = useServices();
  const qc = useQueryClient();
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.tags.all }),
      qc.invalidateQueries({ queryKey: queryKeys.books.all }),
    ]);
  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const tag = await repos.tags.rename(id, name);
      await invalidate();
      return tag;
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await repos.tags.remove(id);
      await invalidate();
    },
  });
  return { rename, remove };
}
