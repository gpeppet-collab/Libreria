import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queryKeys } from './queryKeys';
import { useServices } from './ServicesContext';

export function useBookTypes() {
  const { repos } = useServices();
  const query = useQuery({
    queryKey: queryKeys.bookTypes.all,
    queryFn: () => repos.bookTypes.findAll(),
  });
  const nameById = useMemo(
    () => new Map((query.data ?? []).map((t) => [t.id, t.name])),
    [query.data],
  );
  return { ...query, nameById };
}

export function useBookTypeMutations() {
  const { repos } = useServices();
  const qc = useQueryClient();
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.bookTypes.all }),
      qc.invalidateQueries({ queryKey: queryKeys.books.all }),
    ]);
  const create = useMutation({
    mutationFn: async (name: string) => {
      const t = await repos.bookTypes.create(name);
      await invalidate();
      return t;
    },
  });
  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const t = await repos.bookTypes.rename(id, name);
      await invalidate();
      return t;
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await repos.bookTypes.remove(id);
      await invalidate();
    },
  });
  return { create, rename, remove };
}
