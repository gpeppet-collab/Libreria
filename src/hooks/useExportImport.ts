import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ImportStrategy, LibraryExport } from '@/domain/export';

import { queryKeys } from './queryKeys';
import { useServices } from './ServicesContext';

export function useExportImport() {
  const { exportImport } = useServices();
  const qc = useQueryClient();

  const exportLibrary = useMutation({
    mutationFn: (options: { includeCovers: boolean; destination: 'share' | 'folder' }) =>
      exportImport.exportLibrary(options),
  });
  const pickImport = useMutation({ mutationFn: () => exportImport.pickImportFile() });
  const applyImport = useMutation({
    mutationFn: async ({ data, strategy }: { data: LibraryExport; strategy: ImportStrategy }) => {
      const result = await exportImport.applyImport(data, strategy);
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.books.all }),
        qc.invalidateQueries({ queryKey: queryKeys.tags.all }),
        qc.invalidateQueries({ queryKey: queryKeys.bookTypes.all }),
      ]);
      return result;
    },
  });

  return { exportLibrary, pickImport, applyImport };
}
